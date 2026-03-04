-- ========================================================================================
-- CubiCasa FP Migration Script
-- Migrates data from old sheetbenchmark_transdata_fp_cubi system to project_16 in new system
-- Source: sheetbenchmark_transdata_fp_cubi 2.sql → Target: stellarinstitute_Romio
-- ========================================================================================

-- Step 0: Safety check
SELECT 'Starting CubiCasa migration...' AS status;
SELECT COUNT(*) AS existing_project_16_orders FROM project_16_orders;

-- ========================================================================================
-- Step 1: Create mistake tables for project 16 (matching project_13 structure)
-- ========================================================================================

CREATE TABLE IF NOT EXISTS `project_16_drawer_mistake` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` varchar(100) NOT NULL,
  `product_checklist_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `worker` varchar(500) DEFAULT NULL,
  `worker_type_id` int(11) NOT NULL DEFAULT 0,
  `is_checked` tinyint(1) DEFAULT NULL,
  `count_value` int(11) NOT NULL DEFAULT 0,
  `text_value` varchar(255) DEFAULT NULL,
  `created_by` varchar(100) NOT NULL DEFAULT '',
  `updated_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_worker` (`worker`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `project_16_checker_mistake` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` varchar(100) NOT NULL,
  `product_checklist_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `worker` varchar(500) DEFAULT NULL,
  `worker_type_id` int(11) NOT NULL DEFAULT 0,
  `is_checked` tinyint(1) DEFAULT NULL,
  `count_value` int(11) NOT NULL DEFAULT 0,
  `text_value` varchar(255) DEFAULT NULL,
  `created_by` varchar(100) NOT NULL DEFAULT '',
  `updated_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_worker` (`worker`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `project_16_qa_mistake` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `order_id` varchar(100) NOT NULL,
  `product_checklist_id` bigint(20) unsigned NOT NULL DEFAULT 0,
  `worker` varchar(500) DEFAULT NULL,
  `worker_type_id` int(11) NOT NULL DEFAULT 0,
  `is_checked` tinyint(1) DEFAULT NULL,
  `count_value` int(11) NOT NULL DEFAULT 0,
  `text_value` varchar(255) DEFAULT NULL,
  `created_by` varchar(100) NOT NULL DEFAULT '',
  `updated_by` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_worker` (`worker`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'Mistake tables created.' AS status;

-- ========================================================================================
-- Step 2: Migrate orders from cubi_temp.order → project_16_orders
-- Column mapping:
--   old.id                → (auto-increment new id)
--   old.mp_job_id         → order_number (unique identifier like Metro)
--   old.order_id          → client_reference
--   old.property          → address
--   old.dname             → drawer_name (drawer_id will be matched later)
--   old.cname             → checker_name
--   old.qname             → qa_name
--   old.dassign_time      → dassign_time
--   old.cassign_time      → cassign_time
--   old.q_datetime        → ausFinaldate (if QA done)
--   old.drawer_done       → drawer_done
--   old.drawer_date       → drawer_date
--   old.checker_done      → checker_done
--   old.checker_date      → checker_date
--   old.mistake           → mistake
--   old.cmistake          → cmistake
--   old.final_upload      → final_upload
--   old.amend             → amend
--   old.status            → maps to workflow_state
--   old.ausDatein         → ausDatein (received time)
--   old.ausFinaldate      → ausFinaldate (QA finalised date)
--   old.year/month/date   → year/month/date
--   old.code              → code
--   old.plan_type         → plan_type
--   old.instruction       → instruction
--   old.project_type      → project_type
--   old.d_live_qa/c_live_qa/qa_live_qa → d_live_qa/c_live_qa/qa_live_qa
-- ========================================================================================

INSERT INTO project_16_orders (
  order_number,
  project_id,
  client_reference,
  address,
  client_name,
  current_layer,
  status,
  workflow_state,
  workflow_type,
  drawer_name,
  checker_name,
  qa_name,
  dassign_time,
  cassign_time,
  drawer_done,
  drawer_date,
  checker_done,
  checker_date,
  final_upload,
  ausFinaldate,
  mistake,
  cmistake,
  amend,
  d_live_qa,
  c_live_qa,
  qa_live_qa,
  priority,
  complexity_weight,
  order_type,
  year,
  month,
  date,
  ausDatein,
  code,
  plan_type,
  instruction,
  project_type,
  import_source,
  recheck_count,
  attempt_draw,
  attempt_check,
  attempt_qa,
  checker_self_corrected,
  is_on_hold,
  created_at,
  updated_at
)
SELECT
  -- order_number: use mp_job_id-id to guarantee uniqueness (some UUIDs are duplicated)
  CASE
    WHEN o.mp_job_id IS NOT NULL AND o.mp_job_id != '' THEN CONCAT(o.mp_job_id, '-', o.id)
    ELSE CONCAT('CUBI-', LPAD(o.id, 6, '0'))
  END AS order_number,
  16 AS project_id,
  o.order_id AS client_reference,
  o.property AS address,
  NULL AS client_name,
  -- current_layer: determine from progress
  CASE
    WHEN o.final_upload = 'yes' OR o.ausFinaldate IS NOT NULL THEN 'qa'
    WHEN o.checker_done = 'yes' THEN 'qa'
    WHEN o.drawer_done = 'yes' THEN 'checker'
    ELSE 'drawer'
  END AS current_layer,
  -- status
  CASE
    WHEN o.final_upload = 'yes' THEN 'completed'
    WHEN o.drawer_done = 'yes' OR o.checker_done = 'yes' THEN 'in-progress'
    WHEN o.dname IS NOT NULL AND o.dname != '' THEN 'in-progress'
    ELSE 'pending'
  END AS status,
  -- workflow_state
  CASE
    WHEN o.final_upload = 'yes' THEN 'DELIVERED'
    WHEN o.ausFinaldate IS NOT NULL AND o.ausFinaldate != '' THEN 'DELIVERED'
    WHEN o.checker_done = 'yes' AND o.qname IS NOT NULL AND o.qname != '' THEN 'QA'
    WHEN o.checker_done = 'yes' THEN 'QA'
    WHEN o.drawer_done = 'yes' AND o.cname IS NOT NULL AND o.cname != '' THEN 'CHECK'
    WHEN o.drawer_done = 'yes' THEN 'CHECK'
    WHEN o.dname IS NOT NULL AND o.dname != '' THEN 'DRAW'
    ELSE 'RECEIVED'
  END AS workflow_state,
  'FP_3_LAYER' AS workflow_type,
  o.dname AS drawer_name,
  o.cname AS checker_name,
  o.qname AS qa_name,
  o.dassign_time,
  o.cassign_time,
  o.drawer_done,
  o.drawer_date,
  o.checker_done,
  o.checker_date,
  o.final_upload,
  -- ausFinaldate: use original or q_datetime
  COALESCE(NULLIF(o.ausFinaldate, ''), o.q_datetime) AS ausFinaldate,
  o.mistake,
  o.cmistake,
  o.amend,
  o.d_live_qa,
  o.c_live_qa,
  o.qa_live_qa,
  'normal' AS priority,
  1 AS complexity_weight,
  'standard' AS order_type,
  o.year,
  CASE
    WHEN o.month = '01' OR o.month = '1' THEN 1
    WHEN o.month = '02' OR o.month = '2' THEN 2
    WHEN o.month = '03' OR o.month = '3' THEN 3
    WHEN o.month = '04' OR o.month = '4' THEN 4
    WHEN o.month = '05' OR o.month = '5' THEN 5
    WHEN o.month = '06' OR o.month = '6' THEN 6
    WHEN o.month = '07' OR o.month = '7' THEN 7
    WHEN o.month = '08' OR o.month = '8' THEN 8
    WHEN o.month = '09' OR o.month = '9' THEN 9
    WHEN o.month = '10' THEN 10
    WHEN o.month = '11' THEN 11
    WHEN o.month = '12' THEN 12
    ELSE NULL
  END AS month,
  o.date,
  -- ausDatein: parse the time string to timestamp
  CASE
    WHEN o.pasted_time IS NOT NULL THEN o.pasted_time
    ELSE NULL
  END AS ausDatein,
  o.code,
  o.plan_type,
  o.instruction,
  o.project_type,
  'csv' AS import_source,
  0 AS recheck_count,
  0 AS attempt_draw,
  0 AS attempt_check,
  0 AS attempt_qa,
  0 AS checker_self_corrected,
  0 AS is_on_hold,
  COALESCE(o.pasted_time, NOW()) AS created_at,
  NOW() AS updated_at
FROM `cubi_old_order` o;

SELECT CONCAT('Orders migrated: ', COUNT(*)) AS status FROM project_16_orders;

-- ========================================================================================
-- Step 3: Migrate QA checklist data → project_16_qa_mistake
-- order_checklist is QA data (worker_type_id = 0)
-- The order_id in checklist is mp_job_id (UUID), which maps to order_number in our system
-- ========================================================================================

INSERT INTO project_16_qa_mistake (
  order_id,
  product_checklist_id,
  worker,
  worker_type_id,
  is_checked,
  count_value,
  text_value,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  oc.order_id,
  oc.product_checklist_id,
  oc.worker,
  oc.worker_type_id,
  oc.is_checked,
  oc.count_value,
  oc.text_value,
  oc.created_by,
  oc.updated_by,
  oc.created_at,
  oc.updated_at
FROM `cubi_old_order_checklist` oc;

SELECT CONCAT('QA mistakes migrated: ', COUNT(*)) AS status FROM project_16_qa_mistake;

-- ========================================================================================
-- Step 4: Migrate Drawer checklist data → project_16_drawer_mistake
-- ========================================================================================

INSERT INTO project_16_drawer_mistake (
  order_id,
  product_checklist_id,
  worker,
  worker_type_id,
  is_checked,
  count_value,
  text_value,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  ocd.order_id,
  ocd.product_checklist_id,
  ocd.worker,
  ocd.worker_type_id,
  ocd.is_checked,
  ocd.count_value,
  ocd.text_value,
  ocd.created_by,
  ocd.updated_by,
  ocd.created_at,
  ocd.updated_at
FROM `cubi_old_order_checklist_drawer` ocd;

SELECT CONCAT('Drawer mistakes migrated: ', COUNT(*)) AS status FROM project_16_drawer_mistake;

-- ========================================================================================
-- Step 5: Migrate Checker checklist data → project_16_checker_mistake
-- ========================================================================================

INSERT INTO project_16_checker_mistake (
  order_id,
  product_checklist_id,
  worker,
  worker_type_id,
  is_checked,
  count_value,
  text_value,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  occ.order_id,
  occ.product_checklist_id,
  occ.worker,
  occ.worker_type_id,
  occ.is_checked,
  occ.count_value,
  occ.text_value,
  occ.created_by,
  occ.updated_by,
  occ.created_at,
  occ.updated_at
FROM `cubi_old_order_checklist_checker` occ;

SELECT CONCAT('Checker mistakes migrated: ', COUNT(*)) AS status FROM project_16_checker_mistake;

-- ========================================================================================
-- Step 6: Update delivered_at for completed orders 
-- ========================================================================================

UPDATE project_16_orders
SET delivered_at = CASE
      WHEN ausFinaldate REGEXP '^[0-9]{4}/' THEN STR_TO_DATE(ausFinaldate, '%Y/%m/%d %H:%i:%s')
      WHEN ausFinaldate REGEXP '^[0-9]{4}-' THEN STR_TO_DATE(ausFinaldate, '%Y-%m-%d %H:%i:%s')
      ELSE NULL
    END
WHERE workflow_state = 'DELIVERED' AND delivered_at IS NULL;

-- ========================================================================================
-- Step 7: Update received_at from ausDatein/pasted_time
-- ========================================================================================

UPDATE project_16_orders
SET received_at = ausDatein
WHERE received_at IS NULL AND ausDatein IS NOT NULL;

-- ========================================================================================
-- Step 8: Final verification
-- ========================================================================================

SELECT 'Migration Complete!' AS status;

SELECT 
  COUNT(*) AS total_orders,
  SUM(CASE WHEN workflow_state = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
  SUM(CASE WHEN workflow_state = 'RECEIVED' THEN 1 ELSE 0 END) AS received,
  SUM(CASE WHEN workflow_state = 'DRAW' THEN 1 ELSE 0 END) AS drawing,
  SUM(CASE WHEN workflow_state = 'CHECK' THEN 1 ELSE 0 END) AS checking,
  SUM(CASE WHEN workflow_state = 'QA' THEN 1 ELSE 0 END) AS qa,
  SUM(CASE WHEN workflow_state NOT IN ('DELIVERED','CANCELLED') THEN 1 ELSE 0 END) AS pending
FROM project_16_orders;

SELECT 
  (SELECT COUNT(*) FROM project_16_drawer_mistake) AS drawer_mistakes,
  (SELECT COUNT(*) FROM project_16_checker_mistake) AS checker_mistakes,
  (SELECT COUNT(*) FROM project_16_qa_mistake) AS qa_mistakes;
