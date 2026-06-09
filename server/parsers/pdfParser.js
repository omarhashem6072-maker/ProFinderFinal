const pdf = require("pdf-parse");

const DAY_MAP = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
  Mon: "Mon",
  Tue: "Tue",
  Wed: "Wed",
  Thu: "Thu",
  Fri: "Fri",
  Sat: "Sat",
  Sun: "Sun"
};

function normalizeDay(dayStr) {
  if (!dayStr) return null;
  let trimmed = dayStr.trim();
  if (/days$/i.test(trimmed)) trimmed = trimmed.replace(/days$/i, "day");
  trimmed = trimmed.replace(/[.,;:)]$/g, "");
  const titled = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return DAY_MAP[trimmed] || DAY_MAP[titled] || null;
}

function parseTime(timeStr) {
  if (!timeStr) return null;
  let cleaned = timeStr
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .toLowerCase()
    .replace(/a\.m\./g, "am")
    .replace(/p\.m\./g, "pm");
  
 
  const rangeMatch = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (rangeMatch) {
    let [, startH, startM = "00", startPeriod, endH, endM = "00", endPeriod] = rangeMatch;
    if (!startPeriod && endPeriod) startPeriod = endPeriod;
    
    let startHour = parseInt(startH);
    let endHour = parseInt(endH);
    
    if (startPeriod === "pm" && startHour !== 12) startHour += 12;
    if (startPeriod === "am" && startHour === 12) startHour = 0;
    if (endPeriod === "pm" && endHour !== 12) endHour += 12;
    if (endPeriod === "am" && endHour === 12) endHour = 0;
    
    return {
      start: `${String(startHour).padStart(2, "0")}:${startM}`,
      end: `${String(endHour).padStart(2, "0")}:${endM}`
    };
  }

  const fromToMatch = cleaned.match(/from(\d{1,2})(?::(\d{2}))?(am|pm)?to(\d{1,2})(?::(\d{2}))?(am|pm)?/);
  if (fromToMatch) {
    let [, startH, startM = "00", startPeriod, endH, endM = "00", endPeriod] = fromToMatch;
    if (!startPeriod && endPeriod) startPeriod = endPeriod;

    let startHour = parseInt(startH);
    let endHour = parseInt(endH);

    if (startPeriod === "pm" && startHour !== 12) startHour += 12;
    if (startPeriod === "am" && startHour === 12) startHour = 0;
    if (endPeriod === "pm" && endHour !== 12) endHour += 12;
    if (endPeriod === "am" && endHour === 12) endHour = 0;

    return {
      start: `${String(startHour).padStart(2, "0")}:${startM}`,
      end: `${String(endHour).padStart(2, "0")}:${endM}`
    };
  }
  
  return null;
}

function normalizePdfText(text) {
  return String(text || "")
    .replace(/[–—]/g, "-")
    .replace(/a\.m\./gi, "am")
    .replace(/p\.m\./gi, "pm");
}

function extractOfficeLocation(text) {
  // Accept formats like "Office: ENG425", "Office: KHS 331-C", "Office: ENG432"
  const officeMatch = text.match(/office[:\s]+([A-Z]{2,5}\s*\d{2,4}(?:-[A-Z0-9]+)?)/i);
  if (!officeMatch) return null;
  return officeMatch[1].replace(/\s+/g, " ").trim();
}

function extractEmail(text) {
  const emailMatch = String(text || "").match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  return emailMatch ? emailMatch[0].trim().toLowerCase() : null;
}

function extractOfficeHours(text) {
  const results = [];
  text = normalizePdfText(text);

  const pattern0 = /office\s+hours?[:\s]+([A-Za-z]+days?)\s*,\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;
  let match;
  while ((match = pattern0.exec(text)) !== null) {
    const day = normalizeDay(match[1]);
    const timeRange = parseTime(match[2]);
    if (day && timeRange) {
      results.push({
        day,
        start_time: timeRange.start,
        end_time: timeRange.end
      });
    }
  }

  const pattern1 = /office\s+hours?[:\s]+([A-Za-z]+days?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;
  while ((match = pattern1.exec(text)) !== null) {
    const day = normalizeDay(match[1]);
    const timeRange = parseTime(match[2]);
    if (day && timeRange) {
      results.push({
        day,
        start_time: timeRange.start,
        end_time: timeRange.end
      });
    }
  }
  
  
  const pattern2 = /office\s+hours?[:\s]+([A-Za-z]+days?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)[,\s]+([A-Z]{3,4}\d{3,4})/gi;
  while ((match = pattern2.exec(text)) !== null) {
    const day = normalizeDay(match[1]);
    const timeRange = parseTime(match[2]);
    const location = match[3].trim();
    if (day && timeRange) {
      results.push({
        day,
        start_time: timeRange.start,
        end_time: timeRange.end,
        location
      });
    }
  }
  
  // Pattern 3: "Office: ENG425" followed by "Hours: Friday 12pm-1pm" (separate lines, within reasonable distance)
  const officePattern = /office[:\s]+([A-Z]{2,5}\s*\d{2,4}(?:-[A-Z0-9]+)?)/gi;
  const hoursPattern = /hours?[:\s]+([A-Za-z]+days?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;
  
  let officeMatch;
  while ((officeMatch = officePattern.exec(text)) !== null) {
    const location = officeMatch[1].trim();
    const searchStart = officeMatch.index;
    const searchEnd = Math.min(searchStart + 200, text.length);
    const searchText = text.substring(searchStart, searchEnd);
    
    const hoursMatch = hoursPattern.exec(searchText);
    if (hoursMatch) {
      const day = normalizeDay(hoursMatch[1]);
      const timeRange = parseTime(hoursMatch[2]);
      if (day && timeRange) {
        results.push({
          day,
          start_time: timeRange.start,
          end_time: timeRange.end,
          location
        });
      }
    }
  }
  
  // Pattern 4: Standalone "Friday 12pm-1pm" near "Office" keyword (fallback)
  if (results.length === 0) {
    const standalonePattern = /([A-Za-z]+days?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;
    while ((match = standalonePattern.exec(text)) !== null) {
      const matchIndex = match.index;
      const contextBefore = text.substring(Math.max(0, matchIndex - 50), matchIndex).toLowerCase();
      const contextAfter = text.substring(matchIndex + match[0].length, Math.min(text.length, matchIndex + match[0].length + 50)).toLowerCase();
      
      if (contextBefore.includes('office') || contextAfter.includes('office')) {
        const day = normalizeDay(match[1]);
        const timeRange = parseTime(match[2]);
        if (day && timeRange) {
          results.push({
            day,
            start_time: timeRange.start,
            end_time: timeRange.end
          });
        }
      }
    }
  }

  // Pattern 5: "Office Hours: Monday 3:10pm - 5:00pm, Thursday 3:10pm - 5:00pm"
  // Also supports "Office Hours: Thursdays from 9 to 10 pm"
  const officeHoursLineMatch = text.match(/office\s+hours?[:\s]+([^\n\r]+)/i);
  if (officeHoursLineMatch) {
    const line = officeHoursLineMatch[1];
    const defaultOffice = extractOfficeLocation(text);

    const parts = line.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      //"Day from X to Y pm"
      let m = part.match(/([A-Za-z]+days?)\s+from\s+(\d{1,2}(?::\d{2})?)\s+to\s+(\d{1,2}(?::\d{2})?)\s*(am|pm)/i);
      if (m) {
        const day = normalizeDay(m[1]);
        const timeRange = parseTime(`from ${m[2]} to ${m[3]} ${m[4]}`);
        if (day && timeRange) {
          results.push({
            day,
            start_time: timeRange.start,
            end_time: timeRange.end,
            location: defaultOffice || undefined
          });
        }
        continue;
      }

      // "Day 3:10pm - 5:00pm" (dash range)
      m = part.match(/([A-Za-z]+days?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*-\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (m) {
        const day = normalizeDay(m[1]);
        const timeRange = parseTime(m[2]);
        if (day && timeRange) {
          results.push({
            day,
            start_time: timeRange.start,
            end_time: timeRange.end,
            location: defaultOffice || undefined
          });
        }
      }
    }
  }
  
  // Remove entries with same day/time (keep the one with location if available)
  const unique = [];
  const seen = new Set();
  
  for (const result of results) {
    const key = `${result.day}-${result.start_time}-${result.end_time}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(result);
    } else {
      // If we already have this day/time, but this one has location and the existing doesn't, replace it
      const existing = unique.find(r => `${r.day}-${r.start_time}-${r.end_time}` === key);
      if (existing && !existing.location && result.location) {
        existing.location = result.location;
      }
    }
  }
  
  return unique;
}

function extractOfficeHoursLinesInOrder(text) {
  const normalized = normalizePdfText(text);
  const regex = /office\s+hours?[:\s]*([^\n\r]+)/gi;
  const out = [];
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    const before = normalized.slice(0, match.index);
    const officeMatch = before.match(/office[:\s]+([A-Z]{2,5}\s*\d{2,4}(?:-[A-Z0-9]+)?)/gi);
    const location = officeMatch ? officeMatch[officeMatch.length - 1].replace(/office[:\s]+/i, "").replace(/\s+/g, " ").trim() : null;
    const line = match[1].trim();
    if (/^(?:TBA|TBD)\b/i.test(line)) {
      out.push({ tba: true, location });
      continue;
    }
    const dayCommaTime = line.match(/^([A-Za-z]+days?)\s*,\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (dayCommaTime) {
      const day = normalizeDay(dayCommaTime[1]);
      const timeRange = parseTime(dayCommaTime[2]);
      if (day && timeRange) {
        out.push({ tba: false, day, start_time: timeRange.start, end_time: timeRange.end, location });
        continue;
      }
    }
    const daySpaceTime = line.match(/^([A-Za-z]+days?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (daySpaceTime) {
      const day = normalizeDay(daySpaceTime[1]);
      const timeRange = parseTime(daySpaceTime[2]);
      if (day && timeRange) {
        out.push({ tba: false, day, start_time: timeRange.start, end_time: timeRange.end, location });
        continue;
      }
    }
    const relaxed = line.match(/([A-Za-z]+days?)\s*[,]?\s*(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*(am|pm)?/i);
    if (relaxed) {
      const day = normalizeDay(relaxed[1]);
      const timeRange = parseTime(`${relaxed[2]}-${relaxed[3]} ${relaxed[4] || "pm"}`);
      if (day && timeRange) {
        out.push({ tba: false, day, start_time: timeRange.start, end_time: timeRange.end, location });
        continue;
      }
    }
    out.push({ tba: true, location });
  }
  return out;
}

function extractInstructorBlocks(text) {
  const normalized = normalizePdfText(text);
  const instructorSectionMatch = normalized.match(/instructor(?:\(s\))?[:\s]*\r?\n([\s\S]{0,2500})/i);
  if (!instructorSectionMatch) return [];
  let section = instructorSectionMatch[1];
  const sectionEnd = section.search(/\b(Prerequisite|Learning\s+Objectives|Required\s+Text|Compulsory\s+Text|Reference\s+Text|Course\s+Description|Course\s+Evaluation|Course\s+Organization|Teaching\s+Assistants|Calendar\s+Description|Antirequisites|Canadian\s+Engineering|Microelectronic|Accreditation\s+Board)\b/i);
  if (sectionEnd !== -1) section = section.slice(0, sectionEnd);
  const namePattern = /(?:^|\r?\n)\s*((?:Dr\.?\s*)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*(?:\[Coordinator\]|\[Lecturer\])?/g;
  const nameMatches = [];
  let m;
  while ((m = namePattern.exec(section)) !== null) {
    const name = m[1].trim().replace(/\s*\[Coordinator\]\s*/gi, "").replace(/\s*\[Lecturer\]\s*/gi, "").trim();
    if (/^(Instructor|Course|Office|Phone|Email|Department|Office Hours)$/i.test(name)) continue;
    if (/^(Dr\.\s+)?Office\s+Hours$/i.test(name) || /\bOffice\s+Hours\b/i.test(name)) continue;
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(name) || name.startsWith("Dr.")) {
      nameMatches.push({ index: m.index, name });
    }
  }
  if (nameMatches.length < 2) return [];
  const professorBlocklist = [
    /^Computer\s+Engineering$/i, /^Electrical\s+Engineering$/i, /^Department\s+of\s+/i,
    /^Learning\s+Objectives$/i, /^Reference\s+Text$/i, /^Compulsory\s+Text$/i,
    /^Course\s+Evaluation$/i, /^Course\s+Organization$/i, /^Teaching\s+Assistants$/i,
    /^Calendar\s+Description/i, /^Canadian\s+Engineering/i, /^Engineering\s+Accreditation/i,
    /^Prentice\s+Hall$/i, /^Cengage\s+Learning$/i, /^University\s+Press$/i,
    /^United\s+States$/i, /^Antirequisites/i, /^Microelectronic\s+Circuits$/i,
    /^Dr\.\s+(None|The|This|Text|Description|Reference|United|States|Calendar|Compulsory|Cengage|Prentice|University|Press|Learning|Objectives|Accreditation|Board|Microelectronic|Circuits|Organization|Evaluation|Assistants|Teaching)\b/i,
    /^(Reference\s+Text|Compulsory\s+Text|Learning\s+Objectives|Course\s+Organization|Course\s+Evaluation|Teaching\s+Assistants|Prentice\s+Hall|Cengage\s+Learning|University\s+Press|United\s+States|Microelectronic\s+Circuits|Engineering\s+Accreditation\s+Board)$/i
  ];
  const blocks = [];
  for (let i = 0; i < nameMatches.length; i++) {
    const start = nameMatches[i].index;
    const end = i + 1 < nameMatches.length ? nameMatches[i + 1].index : section.length;
    const blockText = section.slice(start, Math.min(start + 400, end));
    if (!/\b(Office|Office\s+Hours|Email|E-mail|Phone)\s*[:.]/i.test(blockText)) continue;
    let professor = nameMatches[i].name.trim();
    professor = professor.replace(/\s+(Office|Phone|Email|E-mail).*$/i, "").replace(/\s+/g, " ").trim();
    if (!professor || professorBlocklist.some((re) => re.test(professor))) continue;
    const fullBlockText = section.slice(start, end);
    if (!professor.startsWith("Dr.") && /Dr\./i.test(section)) professor = `Dr. ${professor}`;
    const officeLocation = extractOfficeLocation(fullBlockText) || null;
    const email = extractEmail(fullBlockText) || null;
    const hasTbaOrTbd = /office\s+hours?[:\s]*(?:TBA|TBD)\b/i.test(fullBlockText);
    const officeHours = hasTbaOrTbd ? [] : extractOfficeHours(fullBlockText);
    blocks.push({ professor, office_location: officeLocation, email, officeHours, hasTbaOrTbd });
  }
  return blocks;
}

function extractCourseInfo(text) {
  text = normalizePdfText(text);
  const courseCodeMatch = text.match(/\b([A-Z]{3,4}\d{3})\b/);
  const courseCode = courseCodeMatch ? courseCodeMatch[1] : null;
  
  // Extract course name
  let courseName = null;
  if (courseCode) {
    const namePatterns = [
      new RegExp(`${courseCode}[:\\s]+([^\\n]{10,150})`, "i"),
      new RegExp(`${courseCode}[^\\n]{0,20}([A-Z][^\\n]{10,100})`, "i")
    ];
    
    for (const namePattern of namePatterns) {
      const nameMatch = text.match(namePattern);
      if (nameMatch) {
        courseName = nameMatch[1].trim().split(/\n/)[0].trim();
        courseName = courseName.split(/[|•]/)[0].trim();
        if (courseCode && courseName.includes(courseCode)) {
          const parts = courseName.split(new RegExp(`${courseCode}\\s*:\\s*`, "i"));
          const first = (parts[0] || "").trim();
          courseName = first.length > 2 ? first : (parts[1] || courseName).trim();
        }
        if (courseName.length > 5) break;
      }
    }
    
    //look for course name in a structured format
    if (!courseName || courseName.length < 5) {
      const fallbackPattern = /(?:course|subject|title)[:\s]+([A-Z][^\\n]{10,100})/i;
      const fallbackMatch = text.match(fallbackPattern);
      if (fallbackMatch) {
        courseName = fallbackMatch[1].trim().split(/\n/)[0].trim();
      }

    }
  }
  
 
  let professor = null;

  const instructorBlockMatch = text.match(
    /instructor(?:\(s\))?[:\s]*\r?\n\s*(dr\.?\s*[^\r\n]+)/i
  );
  if (instructorBlockMatch) {
    professor = instructorBlockMatch[1]
      .trim()
      .replace(/\s*[\[(].*?[\])]\s*/g, " ")
      .replace(/\s+(Office|Phone|Email|E-mail).*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (/^(Dr\.\s+)?Office\s+Hours$/i.test(professor)) professor = null;
  }

  const instructorPatterns = [
    /instructor(?:\(s\))?[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)\s*\[Coordinator\]/i,
    /instructor(?:\(s\))?[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)\s*\[Lecturer\]/i,
    /instructor[:\s]+(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)(?:\s+Office|\s+ENG|\s+[A-Z]{3,4}\d{3,4}|$)/i,
    /professor[:\s]+(?:Dr\.?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)(?:\s+Office|\s+ENG|\s+[A-Z]{3,4}\d{3,4}|$)/i,
    /(?:Dr\.?\s*)?([A-Z][a-z]+\s+[A-Z][a-z]+?)(?:\s+Office|\s+ENG|\s+[A-Z]{3,4}\d{3,4}|$)/
  ];
  
  if (!professor) {
    for (const pattern of instructorPatterns) {
      const match = text.match(pattern);
      if (match) {
        professor = match[1].trim();
        professor = professor.replace(/\s+(Office|ENG\d+|Room|Location).*$/i, "").trim();       
        if (!professor.startsWith("Dr.") && text.match(/Dr\./i)) {
          professor = `Dr. ${professor}`;
        }
        break;
      }
    }
  }

  const professorBlocklist = [
    /^Computer\s+Engineering$/i,
    /^Electrical\s+Engineering$/i,
    /^Biomedical\s+Engineering$/i,
    /^Department\s+of\s+/i,
    /^(Dr\.\s+)?Office\s+Hours$/i
  ];
  if (professor && professorBlocklist.some((re) => re.test(professor.trim()))) {
    professor = null;
  }


  const officePatterns = [
    /office[:\s]+([A-Z]{3,4}\d{3,4})/i,
    /([A-Z]{3,4}\d{3,4})/
  ];
  
  let officeLocation = null;
  for (const pattern of officePatterns) {
    const match = text.match(pattern);
    if (match && match[1] !== courseCode) {
      officeLocation = match[1].trim();
      break;
    }
  }
  
  return {
    course_code: courseCode,
    course_name: courseName,
    professor,
    office_location: officeLocation,
    professor_email: extractEmail(text)
  };
}

function splitMultipleProfessors(professorStr) {
  if (!professorStr || typeof professorStr !== "string") return [professorStr || "Unknown"];
  const cleaned = professorStr.replace(/\s*\[Coordinator\]\s*/gi, "").replace(/\s*\[Lecturer\]\s*/gi, "").replace(/\s+/g, " ").trim();
  if (/^(Dr\.\s+)?Office\s+Hours$/i.test(cleaned)) return ["Unknown"];
  const parts = cleaned.split(/\s+Dr\.\s+/i).map((p) => p.trim()).filter(Boolean);
  const filtered = parts.filter((p) => !/^(Dr\.\s+)?Office\s+Hours$/i.test(p));
  if (filtered.length === 0) return ["Unknown"];
  if (filtered.length === 1) return [filtered[0].startsWith("Dr.") ? filtered[0] : `Dr. ${filtered[0]}`];
  return filtered.map((p) => (p.startsWith("Dr.") ? p : `Dr. ${p}`));
}

async function parsePDF(buffer) {
  try {
    const data = await pdf(buffer);
    const text = data.text;
    const courseInfo = extractCourseInfo(text);
    const instructorBlocks = extractInstructorBlocks(text);
    const officeHours = extractOfficeHours(text);

    const results = [];
    const courseCode = courseInfo.course_code || "UNKNOWN";
    const courseName = courseInfo.course_name || "Unknown Course";

    if (instructorBlocks.length >= 2) {
      for (const block of instructorBlocks) {
        if (block.officeHours.length > 0) {
          for (const oh of block.officeHours) {
            results.push({
              professor: block.professor,
              course_code: courseCode,
              course_name: courseName,
              day_name: oh.day,
              start_time: oh.start_time,
              end_time: oh.end_time,
              location: oh.location || block.office_location || "TBA",
              email: block.email || null,
              notes: null
            });
          }
        } else {
          results.push({
            professor: block.professor,
            course_code: courseCode,
            course_name: courseName,
            day_name: "Mon",
            start_time: "09:00",
            end_time: "17:00",
            location: block.office_location || "TBA",
            email: block.email || null,
            notes: block.hasTbaOrTbd ? "Office hours: TBA" : null
          });
        }
      }
    } else {
      const professors = splitMultipleProfessors(courseInfo.professor);
      if (officeHours.length > 0) {
        for (const prof of professors) {
          for (const oh of officeHours) {
            results.push({
              professor: prof,
              course_code: courseCode,
              course_name: courseName,
              day_name: oh.day,
              start_time: oh.start_time,
              end_time: oh.end_time,
              location: oh.location || courseInfo.office_location || "TBA",
              email: courseInfo.professor_email || null,
              notes: null
            });
          }
        }
      } else if (courseCode !== "UNKNOWN" || courseName !== "Unknown Course") {
        const hoursByOrder = extractOfficeHoursLinesInOrder(text);
        const hasAnyRealHours = hoursByOrder.some((h) => h && !h.tba && h.day);
        const realCount = hoursByOrder.filter((h) => h && !h.tba && h.day).length;
        const swapTwo = professors.length === 2 && hoursByOrder.length >= 2 && realCount === 1;
        if (professors.length >= 2 && hoursByOrder.length > 0 && hasAnyRealHours) {
          for (let i = 0; i < professors.length; i++) {
            const line = swapTwo ? hoursByOrder[1 - i] : hoursByOrder[i];
            const loc = (line && line.location) || courseInfo.office_location || "TBA";
            if (line && !line.tba && line.day && line.start_time && line.end_time) {
              results.push({
                professor: professors[i],
                course_code: courseCode,
                course_name: courseName,
                day_name: line.day,
                start_time: line.start_time,
                end_time: line.end_time,
                location: loc,
                email: courseInfo.professor_email || null,
                notes: null
              });
            } else {
              results.push({
                professor: professors[i],
                course_code: courseCode,
                course_name: courseName,
                day_name: "Mon",
                start_time: "09:00",
                end_time: "17:00",
                location: loc,
                email: courseInfo.professor_email || null,
                notes: "Office hours: TBA"
              });
            }
          }
        } else {
          const hasTbaOrTbd = /office\s+hours?[:\s]*(?:TBA|TBD)\b/i.test(text);
          for (const prof of professors) {
            results.push({
              professor: prof,
              course_code: courseCode,
              course_name: courseName,
              day_name: "Mon",
              start_time: "09:00",
              end_time: "17:00",
              location: courseInfo.office_location || "TBA",
              email: courseInfo.professor_email || null,
              notes: hasTbaOrTbd ? "Office hours: TBA" : "No office hours detected—please update manually"
            });
          }
        }
      }
    }

    console.log("PDF Parse Results:", {
      courseCode,
      courseName,
      instructorBlocks: instructorBlocks.length,
      officeHoursFound: officeHours.length,
      resultsCount: results.length
    });

    return {
      success: true,
      extracted: results,
      metadata: {
        course_code: courseInfo.course_code,
        course_name: courseInfo.course_name,
        professor: courseInfo.professor,
        office_location: courseInfo.office_location,
        pages: data.numpages
      }
    };
  } catch (err) {
    console.error("PDF parse error:", err);
    return {
      success: false,
      error: err.message,
      extracted: []
    };
  }
}

module.exports = { parsePDF };