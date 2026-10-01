import { getCrmOwnerDisplay } from './crmUserDirectory';

// ---------- Global Set for duplicate detection ----------
export const seenLegacyIds = new Set<string>();
export const resetSeenLegacyIds = () => seenLegacyIds.clear();

// ---------- O(M) Hash Map Builder ----------
export const buildUserLookupMap = (usersDirectory: any[] = []): Map<string, string> => {
  const map = new Map<string, string>();
  if (!Array.isArray(usersDirectory)) return map;
  usersDirectory.forEach((u) => {
    if (!u) return;
    const name = u.name || '';
    if (!name) return;
    if (u.legacyId !== undefined && u.legacyId !== null) map.set(String(u.legacyId), name);
    if (u.id !== undefined && u.id !== null) map.set(String(u.id), name);
    if (u._id !== undefined && u._id !== null) map.set(String(u._id), name);
    if (u.ownerCode) map.set(String(u.ownerCode), name);
    if (u.email) {
      const trimmedEmail = String(u.email).toLowerCase().trim();
      map.set(trimmedEmail, name);
      const prefix = trimmedEmail.split('@')[0];
      if (prefix) map.set(prefix, name);
    }
    if (u.username) {
      const trimmedUsername = String(u.username).toLowerCase().trim();
      map.set(trimmedUsername, name);
      const prefix = trimmedUsername.split('@')[0];
      if (prefix) map.set(prefix, name);
    }
  });
  return map;
};

// ---------- O(1) Normalizer Function with duplicate legacyId fallback ----------
export const normalizeCustomerItem = (
  item: any,
  userMapOrDirectory?: Map<string, string> | any[]
) => {
  if (!item) return {};

  const userMap =
    userMapOrDirectory instanceof Map
      ? userMapOrDirectory
      : buildUserLookupMap(userMapOrDirectory);

  // Merge top‑level and nested data (same as web)
  const dataPayload = item.data && typeof item.data === 'object' ? item.data : {};
  const merged = { ...item, ...dataPayload };

  // ----- Customer Number -----
  // Explicitly cast to String to handle MongoDB NumberInt values like 15
  let rawNumber = String(merged.customerNumber || merged.customerNo || merged.customer_number || merged.customer_no || '').trim();
  const legacyKey = String(item.legacyId ?? item.id ?? merged.legacyId ?? merged.id ?? '');
  let displayCustomerNumber: string;

  // If we have a rawNumber and it's already properly formatted as SSC or OBJ, keep it.
  if (rawNumber && (rawNumber.startsWith('SSC') || rawNumber.startsWith('OBJ'))) {
    displayCustomerNumber = rawNumber;
  } else {
    // Determine the base identifier to format (prefer legacyId, fallback to rawNumber)
    const baseId = legacyKey || rawNumber;
    if (baseId) {
      if (seenLegacyIds.has(baseId)) {
        // Duplicate – fall back to ObjectId (or trimmed hash)
        const fallbackId = item._id?.toString?.() ?? merged._id?.toString?.() ?? baseId;
        displayCustomerNumber = `OBJ${fallbackId.slice(0, 8)}`;
      } else {
        seenLegacyIds.add(baseId);
        // Format to SSC000NN if it is numeric (e.g., '15' -> 'SSC00015')
        const numericMatch = baseId.match(/^\d+$/);
        if (numericMatch) {
          displayCustomerNumber = `SSC${baseId.padStart(5, '0')}`;
        } else {
          displayCustomerNumber = baseId; // Fallback if it's non-numeric
        }
      }
    } else {
      displayCustomerNumber = '-';
    }
  }

  // ----- Customer Owner -----
  const rawOwner = merged.customerOwnerDisplay || merged.customerOwner || merged.customerOwnerName || merged.ownerName || merged.ownerUserId;
  const key = String(rawOwner || '').trim().toLowerCase();
  
  // Directly try to look up in the map
  let displayCustomerOwner = userMap ? (userMap.get(key) || userMap.get(String(rawOwner))) : undefined;

  // Fallback to CRM directory if still missing
  if (!displayCustomerOwner) {
    displayCustomerOwner = getCrmOwnerDisplay(rawOwner);
  }

  // Final fallback to the raw ID if we couldn't resolve
  if (!displayCustomerOwner) {
    displayCustomerOwner = rawOwner ? String(rawOwner) : '-';
  }

  // ----- Display Name Fallback -----
  const displayName = merged.name || merged.customerName || merged.company || merged.company_name || '-';

  return {
    ...merged,
    displayCustomerNumber,
    displayCustomerOwner,
    displayName,
  };
};
