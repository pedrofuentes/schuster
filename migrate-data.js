#!/usr/bin/env node
/**
 * Data Migration Script for Schuster Family Tree
 * 
 * This script transforms the existing data.json to a GEDCOM-inspired format:
 * - Splits birth_death strings into structured birth/death objects
 * - Creates individual records for spouses with unique IDs
 * - Extracts spouse dates from full_text when available
 * - Adds gender inference and family linkages
 */

const fs = require('fs');
const path = require('path');

// Counter for generating spouse IDs
let spouseIdCounter = 1;
let totalPersons = 0;
let personsWithBirth = 0;
let personsWithDeath = 0;
let spousesExtracted = 0;
let spousesWithDates = 0;

/**
 * Parse a birth_death string into structured birth and death objects
 * Examples:
 * - "VALDIVIA 1853-LA UNIÓN 1923"
 * - "LÜBBENAU an der SPREE/BRANDENBURG/PREUßEN 08/12/1818-VALDIVIA 02/06/1897"
 * - "1940-"
 * - "-2007"
 * - "04/08/1890-28/03/1960"
 * - null
 */
function parseBirthDeath(birthDeathStr) {
  if (!birthDeathStr) {
    return { birth: null, death: null };
  }

  const str = birthDeathStr.trim();
  
  // Find the separator (dash between birth and death)
  // The dash is typically after a year (4 digits) or a date (DD/MM/YYYY)
  let splitIndex = -1;
  
  // Try to find a dash that separates birth from death
  // Pattern: look for dash that's not inside a date
  const dashMatches = [...str.matchAll(/-/g)];
  
  for (const match of dashMatches) {
    const idx = match.index;
    // Check if this dash is the separator (not part of a date)
    // A separator dash typically:
    // - Has a year before it (4 digits) OR is at the start
    // - Has content or end after it
    const before = str.substring(0, idx);
    const after = str.substring(idx + 1);
    
    // Check if before ends with a year or date, or is empty (death-only)
    const endsWithYear = /\d{4}$/.test(before) || /\d{2}\/\d{2}\/\d{4}$/.test(before);
    const isEmpty = before === '';
    
    if (endsWithYear || isEmpty) {
      splitIndex = idx;
      break;
    }
  }
  
  let birthPart = '';
  let deathPart = '';
  
  if (splitIndex === -1) {
    // No separator found, assume it's birth-only
    birthPart = str;
  } else if (splitIndex === 0) {
    // Starts with dash, death-only
    deathPart = str.substring(1);
  } else {
    birthPart = str.substring(0, splitIndex);
    deathPart = str.substring(splitIndex + 1);
  }
  
  return {
    birth: parseEventDetails(birthPart.trim()),
    death: parseEventDetails(deathPart.trim())
  };
}

/**
 * Parse an event (birth or death) string into structured data
 * Examples:
 * - "VALDIVIA 1853"
 * - "08/12/1818"
 * - "LA UNIÓN 1923"
 * - "LÜBBENAU an der SPREE/BRANDENBURG/PREUßEN 08/12/1818"
 */
function parseEventDetails(str) {
  if (!str) return null;
  
  // Date patterns
  const fullDatePattern = /(\d{2})\/(\d{2})\/(\d{4})/;
  const yearPattern = /(\d{4})\??$/;
  
  let date = null;
  let datePrecision = null;
  let place = null;
  
  // Try to extract full date (DD/MM/YYYY)
  const fullDateMatch = str.match(fullDatePattern);
  if (fullDateMatch) {
    const [, day, month, year] = fullDateMatch;
    date = `${year}-${month}-${day}`;
    datePrecision = 'day';
    
    // Extract place (everything before the date)
    const dateIndex = str.indexOf(fullDateMatch[0]);
    const beforeDate = str.substring(0, dateIndex).trim();
    const afterDate = str.substring(dateIndex + fullDateMatch[0].length).trim();
    
    place = beforeDate || afterDate || null;
  } else {
    // Try to extract year only
    const yearMatch = str.match(yearPattern);
    if (yearMatch) {
      date = yearMatch[1];
      datePrecision = 'year';
      
      // Extract place (everything before the year)
      const yearIndex = str.lastIndexOf(yearMatch[1]);
      place = str.substring(0, yearIndex).trim() || null;
    } else {
      // No date found, entire string might be a place or unknown
      place = str || null;
    }
  }
  
  // Clean up place
  if (place) {
    // Remove common prefixes/suffixes
    place = place.replace(/^BAUT\.\s*/i, '');
    place = place.replace(/\s*$/g, '');
    if (!place) place = null;
  }
  
  return {
    date: date,
    date_precision: datePrecision,
    place: place,
    original: str
  };
}

/**
 * Extract spouse information from full_text
 * Returns an array of structured spouse objects
 */
function extractSpouseInfo(fullText, spouseNames) {
  if (!fullText || !spouseNames || spouseNames.length === 0) {
    return [];
  }
  
  const spouseRecords = [];
  const processedNames = new Set();
  
  // Pattern to match spouse info: CASADO/A [Iº/IIº] CON NAME (dates) [notes]
  // Using a more flexible pattern that handles the various formats
  const spousePattern = /CASAD[AO]\s*(?:I[ºo°]?\s*|II[ºo°]?\s*|III[ºo°]?\s*)?\s*CON\s+([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s]+?)(?:\s*\(([^)]+)\))?(?:\s*\[([^\]]+)\])?(?:\.|,|\s*HIJOS?:|\s*CASAD|$)/gi;
  
  let match;
  while ((match = spousePattern.exec(fullText)) !== null) {
    let name = match[1].trim();
    const datesStr = match[2] ? match[2].trim() : null;
    const notesStr = match[3] ? match[3].trim() : null;
    
    // Clean up the name
    name = name.replace(/\s+/g, ' ').trim();
    
    // Skip if already processed (avoid duplicates)
    if (processedNames.has(name.toUpperCase())) continue;
    processedNames.add(name.toUpperCase());
    
    // Parse dates if available
    let birth = null;
    let death = null;
    
    if (datesStr) {
      const parsed = parseBirthDeath(datesStr);
      birth = parsed.birth;
      death = parsed.death;
      if (birth || death) spousesWithDates++;
    }
    
    // Generate unique ID for spouse
    const spouseId = `S${spouseIdCounter++}`;
    spousesExtracted++;
    
    // Determine spouse gender (opposite of the person who is "casado/casada")
    let spouseGender = null;
    // Get context around the match
    const matchStart = match.index;
    const contextBefore = fullText.substring(Math.max(0, matchStart - 10), matchStart);
    // If the text says "CASADA CON", the subject is female, so spouse is male
    if (/CASADA/i.test(match[0])) {
      spouseGender = 'M';
    } else if (/CASADO/i.test(match[0])) {
      spouseGender = 'F';
    }
    
    const spouseRecord = {
      id: spouseId,
      name: name.toUpperCase(),
      gender: spouseGender,
      birth: birth,
      death: death,
      notes: notesStr ? [notesStr] : [],
      is_spouse_record: true
    };
    
    spouseRecords.push(spouseRecord);
  }
  
  // If regex didn't find all spouses, create records for missing ones
  for (const name of spouseNames) {
    const upperName = name.toUpperCase();
    if (!processedNames.has(upperName)) {
      const spouseId = `S${spouseIdCounter++}`;
      spousesExtracted++;
      
      spouseRecords.push({
        id: spouseId,
        name: upperName,
        gender: null,
        birth: null,
        death: null,
        notes: [],
        is_spouse_record: true
      });
      processedNames.add(upperName);
    }
  }
  
  return spouseRecords;
}

/**
 * Infer gender from name or context
 */
function inferGender(name, context) {
  // Check context for CASADO (male) or CASADA (female)
  if (context) {
    if (/CASADA\s+CON/i.test(context)) return 'F'; // If someone is "casada", they're female
    if (/CASADO\s+CON/i.test(context)) return 'M'; // If someone is "casado", they're male
  }
  
  // Common Spanish female name endings
  const femaleEndings = /A$|INA$|ELA$|ERA$|ILDA$/i;
  // Common Spanish male name endings
  const maleEndings = /O$|OS$|IO$|ICO$|ARDO$|UNDO$/i;
  
  const firstName = name.split(/\s+/)[0];
  
  if (femaleEndings.test(firstName)) return 'F';
  if (maleEndings.test(firstName)) return 'M';
  
  return null;
}

/**
 * Process a single person node
 */
function processNode(node, allSpouses) {
  totalPersons++;
  
  // Parse birth_death
  const { birth, death } = parseBirthDeath(node.birth_death);
  
  if (birth && birth.date) personsWithBirth++;
  if (death && death.date) personsWithDeath++;
  
  // Extract spouse information
  const spouseRecords = extractSpouseInfo(node.full_text, node.spouses);
  
  // Store spouse records in the global collection
  for (const spouse of spouseRecords) {
    allSpouses.push(spouse);
  }
  
  // Create enhanced node
  const enhanced = {
    id: node.id,
    name: node.name,
    gender: inferGender(node.name, node.full_text),
    birth: birth,
    death: death,
    notes: node.notes || [],
    // Keep original spouses as names for backward compatibility
    spouses: node.spouses || [],
    // Add references to spouse record IDs
    spouse_ids: spouseRecords.map(s => s.id),
    // Keep original fields for reference
    birth_death: node.birth_death,
    full_text: node.full_text,
    // Process children recursively
    children: (node.children || []).map(child => processNode(child, allSpouses))
  };
  
  return enhanced;
}

/**
 * Process an entire section
 */
function processSection(section, allSpouses) {
  return {
    section: section.section,
    roots: section.roots.map(root => processNode(root, allSpouses))
  };
}

/**
 * Main migration function
 */
function migrate() {
  console.log('Starting data migration...\n');
  
  // Read original data
  const dataPath = path.join(__dirname, 'data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  // Process all sections
  const allSpouses = [];
  const enhancedData = data.map(section => processSection(section, allSpouses));
  
  // Create output with metadata
  const output = {
    metadata: {
      version: '2.0.0',
      generated: new Date().toISOString(),
      format: 'enhanced-gedcom-style',
      statistics: {
        total_persons: totalPersons,
        persons_with_birth_date: personsWithBirth,
        persons_with_death_date: personsWithDeath,
        birth_date_coverage: ((personsWithBirth / totalPersons) * 100).toFixed(1) + '%',
        death_date_coverage: ((personsWithDeath / totalPersons) * 100).toFixed(1) + '%',
        total_spouses_extracted: spousesExtracted,
        spouses_with_dates: spousesWithDates
      }
    },
    sections: enhancedData,
    individuals: allSpouses
  };
  
  // Write enhanced data
  const outputPath = path.join(__dirname, 'data-enhanced.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  
  console.log('Migration complete!\n');
  console.log('Statistics:');
  console.log(`  Total persons: ${totalPersons}`);
  console.log(`  Persons with birth date: ${personsWithBirth} (${((personsWithBirth / totalPersons) * 100).toFixed(1)}%)`);
  console.log(`  Persons with death date: ${personsWithDeath} (${((personsWithDeath / totalPersons) * 100).toFixed(1)}%)`);
  console.log(`  Spouses extracted: ${spousesExtracted}`);
  console.log(`  Spouses with dates: ${spousesWithDates}`);
  console.log(`\nOutput written to: ${outputPath}`);
}

// Run migration
migrate();
