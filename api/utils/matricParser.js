const programMap = {
  CG: {
    department: "Computer and Information Science",
    program: "BSc Computer Science",
  },
  CH: {
    department: "Computer and Information Science",
    program: "BSc Management and Information Science",
  },
};

function extractAcademicInfo(matricNumber) {
  const code = matricNumber.slice(2, 4);
  return programMap[code] || null;
}

export { extractAcademicInfo };
