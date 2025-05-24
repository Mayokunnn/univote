const programMap = {
    CG: { department: "CIS", program: "CS" },
    CH: { department: "CIS", program: "MIS" },
    AK: { department: "PSIR", program: "PSS" },
    // Add more here
  };
  
  function extractAcademicInfo(matricNumber) {
    const code = matricNumber.slice(2, 4);
    return programMap[code] || null;
  }
  
export {extractAcademicInfo}
  