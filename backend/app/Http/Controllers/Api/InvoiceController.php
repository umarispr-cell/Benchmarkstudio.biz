<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Requests\UpdateInvoiceRequest;
use App\Models\ActivityLog;
use App\Models\Invoice;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['project', 'preparedBy', 'approvedBy']);

        // Filter by project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by month/year
        if ($request->has('month')) {
            $query->where('month', $request->month);
        }

        if ($request->has('year')) {
            $query->where('year', $request->year);
        }

        // Search by invoice number
        if ($request->has('search')) {
            $query->where('invoice_number', 'like', '%' . $request->search . '%');
        }

        $invoices = $query->latest()->paginate($request->per_page ?? 15);

        return response()->json($invoices);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreInvoiceRequest $request)
    {
        $data = $request->validated();
        $data['prepared_by'] = auth()->id();

        $invoice = Invoice::create($data);

        ActivityLog::log('created_invoice', Invoice::class, $invoice->id, null, $invoice->toArray());

        return response()->json([
            'message' => 'Invoice created successfully',
            'data' => $invoice->load(['project', 'preparedBy']),
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $invoice = Invoice::with(['project', 'preparedBy', 'approvedBy'])->findOrFail($id);

        return response()->json([
            'data' => $invoice,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateInvoiceRequest $request, string $id)
    {
        $invoice = Invoice::findOrFail($id);
        $oldValues = $invoice->toArray();

        // Don't allow updating approved or sent invoices
        if (in_array($invoice->status, ['approved', 'sent'])) {
            return response()->json([
                'message' => 'Cannot update approved or sent invoices',
            ], 403);
        }

        $invoice->update($request->validated());

        ActivityLog::log('updated_invoice', Invoice::class, $invoice->id, $oldValues, $invoice->toArray());

        return response()->json([
            'message' => 'Invoice updated successfully',
            'data' => $invoice->load(['project', 'preparedBy', 'approvedBy']),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $invoice = Invoice::findOrFail($id);
        $oldValues = $invoice->toArray();

        // Don't allow deleting approved or sent invoices
        if (in_array($invoice->status, ['approved', 'sent'])) {
            return response()->json([
                'message' => 'Cannot delete approved or sent invoices',
            ], 403);
        }

        $invoice->delete();

        ActivityLog::log('deleted_invoice', Invoice::class, $id, $oldValues, null);

        return response()->json([
            'message' => 'Invoice deleted successfully',
        ]);
    }

    /**
     * Approve an invoice.
     */
    public function approve(string $id)
    {
        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'pending_approval') {
            return response()->json([
                'message' => 'Invoice is not pending approval',
            ], 400);
        }

        $invoice->update([
            'status' => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        ActivityLog::log('approved_invoice', Invoice::class, $invoice->id);

        return response()->json([
            'message' => 'Invoice approved successfully',
            'data' => $invoice->fresh(['project', 'preparedBy', 'approvedBy']),
        ]);
    }

    /**
     * Submit invoice for approval.
     */
    public function submitForApproval(string $id)
    {
        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft invoices can be submitted for approval',
            ], 400);
        }

        $invoice->update([
            'status' => 'pending_approval',
        ]);

        ActivityLog::log('submitted_invoice_for_approval', Invoice::class, $invoice->id);

        return response()->json([
            'message' => 'Invoice submitted for approval',
            'data' => $invoice,
        ]);
    }

    /**
     * Mark invoice as sent.
     */
    public function markAsSent(string $id)
    {
        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'approved') {
            return response()->json([
                'message' => 'Only approved invoices can be marked as sent',
            ], 400);
        }

        $invoice->update([
            'status' => 'sent',
        ]);

        ActivityLog::log('sent_invoice', Invoice::class, $invoice->id);

        return response()->json([
            'message' => 'Invoice marked as sent',
            'data' => $invoice,
        ]);
    }
}
