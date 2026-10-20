import { ExtractedPernoiteItem, VehicleType, CargoStatus } from '../types';

/**
 * Normalizes Brazilian license plates.
 * In the telemetry prints, plates are inverted: numbers/Mercosul part on left, 3 letters on right (e.g. 5A80-HBG or 3183-TCE C.)
 * This converts them to the official standard: ABC-1234 or ABC-1D23.
 */
export function normalizePlate(raw: string): { normalized: string; original: string } {
  if (!raw) return { normalized: '', original: '' };
  
  const original = raw.trim();
  // Remove suffix like C., R ..., etc.
  let cleaned = original
    .replace(/\s+(C\.?|R\.?|\.{2,}).*$/i, '')
    .replace(/[^A-Za-z0-9\-\/]/g, '')
    .toUpperCase();

  // Replace OCR slashes like 0/67 -> 0167
  cleaned = cleaned.replace(/\//g, '1');

  // Split by dash if exists
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    if (parts.length >= 2) {
      const p1 = parts[0].trim();
      const p2 = parts[1].trim();

      // If p1 is 4 chars (like 5A80 or 3183) and p2 is 3 letters (like HBG or TCE) -> INVERT!
      if (/^[A-Z0-9]{4}$/.test(p1) && /^[A-Z]{3}$/.test(p2)) {
        return { normalized: `${p2}-${p1}`, original };
      }

      // If already correct (p1 is 3 letters, p2 is 4 chars)
      if (/^[A-Z]{3}$/.test(p1) && /^[A-Z0-9]{4}$/.test(p2)) {
        return { normalized: `${p1}-${p2}`, original };
      }

      // Handle cases where p2 might have an extra noise char
      const lettersMatch = p2.match(/[A-Z]{3}/);
      if (lettersMatch && /^[A-Z0-9]{4}$/.test(p1)) {
        return { normalized: `${lettersMatch[0]}-${p1}`, original };
      }
    }
  }

  // Without dash
  const pureAlphanumeric = cleaned.replace(/[^A-Z0-9]/g, '');
  if (pureAlphanumeric.length === 7) {
    const first4 = pureAlphanumeric.slice(0, 4);
    const last3 = pureAlphanumeric.slice(4);
    // If ending in 3 letters, it's inverted (e.g. 5A80HBG)
    if (/^[A-Z]{3}$/.test(last3)) {
      return { normalized: `${last3}-${first4}`, original };
    }
    // If starting with 3 letters (e.g. HBG5A80)
    const first3 = pureAlphanumeric.slice(0, 3);
    const last4 = pureAlphanumeric.slice(3);
    if (/^[A-Z]{3}$/.test(first3)) {
      return { normalized: `${first3}-${last4}`, original };
    }
  }

  return { normalized: cleaned, original };
}

/**
 * Detects vehicle type from operation text
 */
export function detectVehicleType(text: string): VehicleType {
  const upper = text.toUpperCase();
  if (upper.includes('RODOTREM') || upper.includes('RODO TREM')) {
    return 'RODOTREM';
  }
  if (/\bLS\b/.test(upper) || upper.includes('OP LS')) {
    return 'LS';
  }
  if (upper.includes('CONT') || upper.includes('CONTAINER') || upper.includes('CONTEINER')) {
    return 'CONTEINER';
  }
  return 'CONTEINER';
}

/**
 * Detects cargo status from text or background
 */
export function detectCargoStatusFromText(text: string): CargoStatus {
  const upper = text.toUpperCase();
  if (upper.includes('24-FIM') || upper.includes('FIM VIAG') || upper.includes('VAZIO')) {
    return 'VAZIO';
  }
  if (upper.includes('04-EM') || upper.includes('EM VIAG') || upper.includes('CARREGADO')) {
    return 'CARREGADO';
  }
  return 'CARREGADO';
}

/**
 * Parses raw copied telemetry text (like what the user posted in the prompt)
 */
export function parseTelemetryRawText(rawText: string, defaultDate: string): ExtractedPernoiteItem[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const items: ExtractedPernoiteItem[] = [];

  let currentOp = '';
  let currentStatus: CargoStatus = 'CARREGADO';
  let currentDriver = '';
  let currentPlate = '';
  let currentVelocity = '';
  let currentLocation = '';

  const finalizeItem = () => {
    if (currentDriver && currentPlate) {
      const { normalized, original } = normalizePlate(currentPlate);
      const tipo = detectVehicleType(currentOp);
      items.push({
        id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        data: defaultDate,
        placa: normalized,
        placaOriginal: original,
        motorista: currentDriver.toUpperCase(),
        tipo,
        observacao: '',
        status: currentStatus,
        operacaoOriginal: currentOp,
        velocidade: currentVelocity,
        localizacao: currentLocation,
      });
    }
    currentOp = '';
    currentDriver = '';
    currentPlate = '';
    currentVelocity = '';
    currentLocation = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect operation / status start
    if (line.startsWith('04-') || line.startsWith('24-') || line.includes('Viagem') || line.includes('Fim Viag')) {
      if (currentDriver && currentPlate) {
        finalizeItem();
      }
      currentOp = line;
      currentStatus = detectCargoStatusFromText(line);
      continue;
    }

    // Check if line is a plate: e.g. "5A80-HBG", "3183-TCE C.", "4B04-SIT R ... 261099"
    const plateMatch = line.match(/\b([0-9][A-Z0-9]{3}-[A-Z]{3}|[A-Z]{3}-[0-9][A-Z0-9]{3})\b/i);
    if (plateMatch) {
      currentPlate = plateMatch[0];
      // Check if driver name is on same line before plate or on previous line
      const lineWithoutPlate = line.replace(plateMatch[0], '').replace(/\s*(C\.|R\.\.\.|\.{2,}).*$/i, '').trim();
      if (lineWithoutPlate && !currentDriver && /^[A-Z\s]{4,}$/i.test(lineWithoutPlate)) {
        currentDriver = lineWithoutPlate;
      }
      continue;
    }

    // Check if line is a plate without clean match e.g. "0/67-HBN"
    if (/^[0-9\/][A-Z0-9]{3}-[A-Z]{3}/i.test(line)) {
      currentPlate = line.split(' ')[0];
      continue;
    }

    // Speed and location check
    if (line.includes('Km/h') || line.includes('Km') || line.includes('PRF') || line.includes('POSTO')) {
      const speedMatch = line.match(/(\d+(?:\.\d+)?\s*Km\/h)/i);
      if (speedMatch) {
        currentVelocity = speedMatch[1];
      }
      currentLocation = line;
      continue;
    }

    // Number alone like "264607" (telemetry ID)
    if (/^\d{5,8}$/.test(line)) {
      continue;
    }

    // If all letters and length > 3, likely driver name
    if (/^[A-ZÀ-Ú\s\.\-]+$/i.test(line) && line.length > 3 && !line.includes('OP ') && !line.includes('DESENGATE')) {
      currentDriver = line.replace(/\.{2,}$/, '').trim();
      continue;
    }

    // If it contains "OP " or "DESENGATE", it belongs to operation
    if (line.includes('OP ') || line.includes('DESENGATE') || line.includes('LIBERADA') || line.includes('RODOTREM')) {
      currentOp += (currentOp ? ' ' : '') + line;
      if (line.includes('RODOTREM')) {
        // vehicle hint
      }
    }
  }

  finalizeItem();
  return items;
}

/**
 * Format items for Excel Clipboard.
 * Column structure strictly matches the user's Excel spreadsheet:
 * Col 1 (A): DATA
 * Col 2 (B): PLACA
 * Col 3 (C): MOTORISTA
 * Col 4 (D): TIPO
 * Col 5 (E): OBSERVAÇÃO (blank by default, or with custom notes)
 * Col 6 (F): STATUS CARGA (CARREGADO / VAZIO)
 */
export function formatForExcelClipboard(
  items: ExtractedPernoiteItem[],
  includeHeaders: boolean = false,
  includeObservationCol: boolean = true
): string {
  const rows: string[] = [];

  if (includeHeaders) {
    if (includeObservationCol) {
      rows.push(['DATA', 'PLACA', 'MOTORISTA', 'TIPO', 'OBSERVAÇÃO', 'STATUS CARGA'].join('\t'));
    } else {
      rows.push(['DATA', 'PLACA', 'MOTORISTA', 'TIPO', 'STATUS CARGA'].join('\t'));
    }
  }

  for (const item of items) {
    if (includeObservationCol) {
      rows.push([
        item.data,
        item.placa,
        item.motorista,
        item.tipo,
        item.observacao || '',
        item.status
      ].join('\t'));
    } else {
      rows.push([
        item.data,
        item.placa,
        item.motorista,
        item.tipo,
        item.status
      ].join('\t'));
    }
  }

  return rows.join('\n');
}

/**
 * Generates CSV content with UTF-8 BOM so Excel opens accents cleanly.
 */
export function generateCsvContent(items: ExtractedPernoiteItem[]): string {
  const headers = ['DATA', 'PLACA', 'MOTORISTA', 'TIPO', 'OBSERVAÇÃO', 'STATUS CARGA'];
  const lines = [headers.join(';')];

  for (const item of items) {
    const row = [
      item.data,
      item.placa,
      `"${item.motorista.replace(/"/g, '""')}"`,
      item.tipo,
      `"${(item.observacao || '').replace(/"/g, '""')}"`,
      item.status
    ];
    lines.push(row.join(';'));
  }

  // UTF-8 BOM: \uFEFF
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Generates an Excel-compliant XML file (SpreadsheetML) that opens directly in Microsoft Excel,
 * with styled headers, emerald background for CARREGADO and gray background for VAZIO!
 */
export function generateExcelXml(items: ExtractedPernoiteItem[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Loaded">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#065F46" ss:Bold="1"/>
   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Empty">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#475569" ss:Bold="1"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Center">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="TextLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Pernoite">
  <Table>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="260"/>
   <Column ss:Width="110"/>
   <Column ss:Width="200"/>
   <Column ss:Width="120"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">DATA</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">PLACA</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">MOTORISTA</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">TIPO</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">OBSERVAÇÃO</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">STATUS CARGA</Data></Cell>
   </Row>
   ${items.map(item => `
   <Row ss:Height="20">
    <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(item.data)}</Data></Cell>
    <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(item.placa)}</Data></Cell>
    <Cell ss:StyleID="TextLeft"><Data ss:Type="String">${escapeXml(item.motorista)}</Data></Cell>
    <Cell ss:StyleID="Center"><Data ss:Type="String">${escapeXml(item.tipo)}</Data></Cell>
    <Cell ss:StyleID="TextLeft"><Data ss:Type="String">${escapeXml(item.observacao || '')}</Data></Cell>
    <Cell ss:StyleID="${item.status === 'CARREGADO' ? 'Loaded' : 'Empty'}"><Data ss:Type="String">${escapeXml(item.status)}</Data></Cell>
   </Row>`).join('')}
  </Table>
 </Worksheet>
</Workbook>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
