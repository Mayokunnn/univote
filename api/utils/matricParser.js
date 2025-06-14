const programMap = {
    CG: { department: "Computer and Information Science", program: "CS" },
    CH: { department: "Computer and Information Science", program: "MIS" },
  };
  
  function extractAcademicInfo(matricNumber) {
    const code = matricNumber.slice(2, 4);
    return programMap[code] || null;
  }
  
export {extractAcademicInfo}
  