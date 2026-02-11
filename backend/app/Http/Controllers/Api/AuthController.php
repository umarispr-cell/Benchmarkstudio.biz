<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Handle user login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Check if user is active
        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated.'],
            ]);
        }

        // Check for existing active session
        $existingSession = UserSession::where('user_id', $user->id)->first();
        if ($existingSession) {
            // Optionally, you can force logout the existing session
            // For now, we'll return an error
            return response()->json([
                'message' => 'This account is already logged in on another device. Please logout from the other device first.',
            ], 409); // 409 Conflict
        }

        // Create token
        $token = $user->createToken('auth-token')->plainTextToken;

        // Create session record
        UserSession::create([
            'user_id' => $user->id,
            'session_id' => session()->getId(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'last_activity' => now(),
        ]);

        // Update last activity
        $user->update(['last_activity' => now()]);

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Handle user logout
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        // Delete session record
        UserSession::where('user_id', $user->id)->delete();

        // Revoke all tokens
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get authenticated user profile
     */
    public function profile(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Check if session is valid
     */
    public function sessionCheck(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['valid' => false], 401);
        }

        // Check if session exists
        $session = UserSession::where('user_id', $user->id)
            ->where('session_id', session()->getId())
            ->first();

        if (!$session) {
            return response()->json(['valid' => false], 401);
        }

        // Update last activity
        $session->update(['last_activity' => now()]);
        $user->update(['last_activity' => now()]);

        return response()->json(['valid' => true]);
    }

    /**
     * Refresh authentication token
     */
    public function refresh(Request $request)
    {
        $user = $request->user();

        // Revoke old tokens
        $user->tokens()->delete();

        // Create new token
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
        ]);
    }
}
