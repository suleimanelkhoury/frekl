/**
 * useHistoryDrillDown — shared state for the ExpenseHistoryModal
 * drill-down ("show every recorded entry for this row label").
 *
 * Used by ChartsPage, InvestmentsPage, RecurringItemsModal, and
 * GlobalSearch: `openFor(label)` mounts the modal, `close()` unmounts
 * it. Callers render the modal themselves:
 *
 *   const history = useHistoryDrillDown();
 *   ...
 *   {history.label && (
 *     <ExpenseHistoryModal label={history.label} onClose={history.close} />
 *   )}
 */

import { useState } from 'react';

export function useHistoryDrillDown() {
  const [historyLabel, setHistoryLabel] = useState<string | null>(null);
  return {
    /** The open drill-down's row label, or null when closed. */
    label: historyLabel,
    /** Open the drill-down for a row label. */
    openFor: setHistoryLabel,
    /** Close the drill-down. */
    close: () => setHistoryLabel(null),
  };
}
