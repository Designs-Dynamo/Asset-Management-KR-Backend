/* ================================================================
   GUJARAT REGION & BRANCH CONFIGURATION
   Hierarchy: ADMIN > REGION_MANAGER > BRANCH_USER
================================================================ */
 
export const REGIONS = {
  SAURASHTRA:      "SAURASHTRA",
  SOUTH_GUJARAT:   "SOUTH_GUJARAT",
  CENTRAL_GUJARAT: "CENTRAL_GUJARAT",
  NORTH_GUJARAT:   "NORTH_GUJARAT"
};
 
export const BRANCHES = {
 
  /* ── SAURASHTRA ── */
  RAJKOT:        { branchId: "BR_RAJKOT",       regionId: "SAURASHTRA",      city: "Rajkot" },
  JAMNAGAR:      { branchId: "BR_JAMNAGAR",      regionId: "SAURASHTRA",      city: "Jamnagar" },
  JUNAGADH:      { branchId: "BR_JUNAGADH",      regionId: "SAURASHTRA",      city: "Junagadh" },
  BHAVNAGAR:     { branchId: "BR_BHAVNAGAR",     regionId: "SAURASHTRA",      city: "Bhavnagar" },
  PORBANDAR:     { branchId: "BR_PORBANDAR",     regionId: "SAURASHTRA",      city: "Porbandar" },
  MORBI:         { branchId: "BR_MORBI",         regionId: "SAURASHTRA",      city: "Morbi" },
  SURENDRANAGAR: { branchId: "BR_SURENDRANAGAR", regionId: "SAURASHTRA",      city: "Surendranagar" },
 
  /* ── SOUTH GUJARAT ── */
  SURAT:         { branchId: "SRT001",         regionId: "SOUTH_GUJARAT",   city: "Surat" },
  VAPI:          { branchId: "BR_VAPI",          regionId: "SOUTH_GUJARAT",   city: "Vapi" },
  NAVSARI:       { branchId: "BR_NAVSARI",       regionId: "SOUTH_GUJARAT",   city: "Navsari" },
  BHARUCH:       { branchId: "BR_BHARUCH",       regionId: "SOUTH_GUJARAT",   city: "Bharuch" },
  BARDOLI:       { branchId: "BR_BARDOLI",       regionId: "SOUTH_GUJARAT",   city: "Bardoli" },
  TAPI:          { branchId: "BR_TAPI",          regionId: "SOUTH_GUJARAT",   city: "Tapi" },
 
  /* ── CENTRAL GUJARAT ── */
  AHMEDABAD:     { branchId: "BR_AHMEDABAD",     regionId: "CENTRAL_GUJARAT", city: "Ahmedabad" },
  VADODARA:      { branchId: "BR_VADODARA",      regionId: "CENTRAL_GUJARAT", city: "Vadodara" },
  ANAND:         { branchId: "BR_ANAND",         regionId: "CENTRAL_GUJARAT", city: "Anand" },
  NADIAD:        { branchId: "BR_NADIAD",        regionId: "CENTRAL_GUJARAT", city: "Nadiad" },
  GODHRA:        { branchId: "BR_GODHRA",        regionId: "CENTRAL_GUJARAT", city: "Godhra" },
  DAHOD:         { branchId: "BR_DAHOD",         regionId: "CENTRAL_GUJARAT", city: "Dahod" },
 
  /* ── NORTH GUJARAT ── */
  MEHSANA:       { branchId: "BR_MEHSANA",       regionId: "NORTH_GUJARAT",   city: "Mehsana" },
  GANDHINAGAR:   { branchId: "BR_GANDHINAGAR",   regionId: "NORTH_GUJARAT",   city: "Gandhinagar" },
  PATAN:         { branchId: "BR_PATAN",         regionId: "NORTH_GUJARAT",   city: "Patan" },
  BANASKANTHA:   { branchId: "BR_BANASKANTHA",   regionId: "NORTH_GUJARAT",   city: "Banaskantha" },
  SABARKANTHA:   { branchId: "BR_SABARKANTHA",   regionId: "NORTH_GUJARAT",   city: "Sabarkantha" },
  HIMMATNAGAR:   { branchId: "BR_HIMMATNAGAR",   regionId: "NORTH_GUJARAT",   city: "Himmatnagar" },

  HQ:            { branchId: "HQ",               regionId: null,              city: "Head Office" }
};
 
/* ── Get regionId from branchId ── */
export const getRegionByBranch = (branchId) => {
  const branch = Object.values(BRANCHES).find(b => b.branchId === branchId);
  return branch ? branch.regionId : null;
};
 
/* ── Get all branches of a region ── */
export const getBranchesByRegion = (regionId) => {
  return Object.values(BRANCHES).filter(b => b.regionId === regionId);
};