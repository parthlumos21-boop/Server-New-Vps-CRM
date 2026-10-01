const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/utils/excelExport.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the font and fill colors
content = content.replace(
  /<font><b\/><sz val="11"\/><name val="Calibri"\/><color rgb="FF1F1F1F"\/><\/font>/,
  '<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>'
);

// We need to replace the 3rd fill (which is header) with green
const fillsRegex = /(<fill><patternFill patternType="solid"><fgColor rgb="FFF6F6F6"\/><bgColor indexed="64"\/><\/patternFill><\/fill>\r?\n\s+<fill><patternFill patternType="solid"><fgColor rgb=")(FFE6F2FF)("\/><bgColor indexed="64"\/><\/patternFill><\/fill>)/;
content = content.replace(fillsRegex, $1FF00B050);

// 2. Fix the header logic
const headerLogicOld = \  const headerRowNumber = currentRow + 1
  currentRow = headerRowNumber

  // \ud83d\udcca Header row \ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca\ud83d\udcca
  const headerCells = columns.map((column, index) => buildCellXml({
    ref: \\\\\\\\\\\\,
    styleIndex: STYLE_INDICES.header,
    value: column.label ?? column.key ?? '',
    type: 'inlineStr',
  })).join('')
  pushRow(headerRowNumber, headerCells, { height: 24 })\;

const headerLogicNew = \  const hasGroupLabels = columns.some((col) => col.groupLabel)
  let filterRowNumber = currentRow + 1

  if (hasGroupLabels) {
    const headerRowNumber = currentRow + 1
    currentRow = headerRowNumber

    // Tier 1 (Group labels and merged standard headers)
    const tier1Cells = columns.map((column, index, arr) => {
      if (column.groupLabel) {
        if (index === 0 || arr[index - 1].groupLabel !== column.groupLabel) {
          const groupCount = arr.filter((c) => c.groupLabel === column.groupLabel).length
          if (groupCount > 1) {
            mergeRanges.push(\\\\\\\\\:\\\\\\\\\)
          }
          return buildCellXml({
            ref: \\\\\\\\\\\\,
            styleIndex: STYLE_INDICES.header,
            value: column.groupLabel,
            type: 'inlineStr',
          })
        }
        return buildCellXml({
          ref: \\\\\\\\\\\\,
          styleIndex: STYLE_INDICES.header,
          value: '',
          type: 'inlineStr',
        })
      }
      
      mergeRanges.push(\\\\\\\\\:\\\\\\\\\)
      return buildCellXml({
        ref: \\\\\\\\\\\\,
        styleIndex: STYLE_INDICES.header,
        value: column.label ?? column.key ?? '',
        type: 'inlineStr',
      })
    }).join('')
    pushRow(currentRow, tier1Cells, { height: 24 })

    // Tier 2 (Sub-labels)
    currentRow += 1
    filterRowNumber = currentRow
    const tier2Cells = columns.map((column, index) => {
      if (column.groupLabel) {
        return buildCellXml({
          ref: \\\\\\\\\\\\,
          styleIndex: STYLE_INDICES.header,
          value: column.label ?? column.key ?? '',
          type: 'inlineStr',
        })
      }
      return buildCellXml({
        ref: \\\\\\\\\\\\,
        styleIndex: STYLE_INDICES.header,
        value: '', // Covered by vertical merge
        type: 'inlineStr',
      })
    }).join('')
    pushRow(currentRow, tier2Cells, { height: 24 })
  } else {
    const headerRowNumber = currentRow + 1
    currentRow = headerRowNumber
    filterRowNumber = headerRowNumber

    // \ud83d\udcca Header row
    const headerCells = columns.map((column, index) => buildCellXml({
      ref: \\\\\\\\\\\\,
      styleIndex: STYLE_INDICES.header,
      value: column.label ?? column.key ?? '',
      type: 'inlineStr',
    })).join('')
    pushRow(headerRowNumber, headerCells, { height: 24 })
  }\;

content = content.replace(headerLogicOld, headerLogicNew);

// 3. Fix autoFilter reference
content = content.replace(
  /<autoFilter ref="A\$\{headerRowNumber\}:\$\{lastDataCol\}\$\{lastDataRow\}"\/>/,
  '<autoFilter ref="A\:\\"/>'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update complete.');
