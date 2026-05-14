import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';
import { prisma } from '../db.js';
import type { AttendanceStatus } from '@prisma/client';

const FONT_BIG = { name: 'Times New Roman', size: 10, bold: true } as const;
const FONT_SM = { name: 'Times New Roman', size: 8, bold: true } as const;
const FONT_CELL = { name: 'Times New Roman', size: 10 } as const;

const YELLOW: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFF00' },
};

const THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

const UND = '_______';

function statusLetter(s: AttendanceStatus | undefined): string {
  if (s === 'PRESENT' || s === 'LATE') return 'Я';
  if (s === 'ABSENT') return 'Н';
  return '';
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^\w-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'org'
  );
}

export async function generateTimesheetXlsx(
  orgId: number,
  from: string,
  to: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error('Org not found');

  const staff = await prisma.staff.findMany({
    where: { organizationId: orgId, active: true },
    orderBy: { fullName: 'asc' },
  });
  const att = await prisma.attendance.findMany({
    where: { organizationId: orgId, date: { gte: from, lte: to } },
  });

  const map = new Map<string, AttendanceStatus>();
  for (const a of att) map.set(`${a.staffId}::${a.date}`, a.status);

  const fromDt = DateTime.fromISO(from);
  const toDt = DateTime.fromISO(to);
  const days: string[] = [];
  for (let c = fromDt; c <= toDt; c = c.plus({ days: 1 })) {
    days.push(c.toFormat('yyyy-LL-dd'));
  }
  const inPeriod = new Set(days.map((d) => Number(d.slice(-2))));
  const workHours = org.workHoursPerDay ?? 8;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Attendly';
  wb.created = new Date();
  const ws = wb.addWorksheet('Табель', {
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true },
  });

  ws.getColumn('A').width = 2;
  ws.getColumn('B').width = 5;
  ws.getColumn('C').width = 24;
  ws.getColumn('D').width = 18;
  for (let c = 5; c <= 35; c++) ws.getColumn(c).width = 3.5;
  ws.getColumn('AJ').width = 6;
  ws.getColumn('AK').width = 6;

  ws.getCell('B1').value = 'Согласовано:';
  ws.getCell('B2').value = `${
    org.departmentHead ? 'Директор по производству' : UND
  } ${org.legalEntityName ? `ООО "${org.legalEntityName}"` : UND}`;
  ws.getCell('B3').value = `____________${org.departmentHead || UND}`;
  ws.getCell('AC1').value = '"УТВЕРЖДАЮ"';
  ws.getCell('AC2').value = `Директор ${
    org.legalEntityName ? `ООО "${org.legalEntityName}"` : UND
  }`;
  ws.getCell('AC3').value = `___________${org.directorName || UND}`;
  for (const a of ['B1', 'B2', 'B3', 'AC1', 'AC2', 'AC3']) {
    ws.getCell(a).font = FONT_BIG;
  }

  ws.getCell('B5').value = 'наименование организации';
  ws.getCell('B5').font = FONT_SM;
  ws.getCell('B6').value = org.departmentName || org.name;
  ws.getCell('B6').font = FONT_BIG;
  ws.getCell('B7').value = 'структурное подразделение';
  ws.getCell('B7').font = FONT_SM;

  ws.getCell('V8').value = 'Номер документа';
  ws.getCell('V8').font = FONT_SM;
  ws.getCell('X8').value = org.documentNumber || UND;
  ws.getCell('X8').font = FONT_BIG;
  ws.getCell('AA8').value = 'Дата составления';
  ws.getCell('AA8').font = FONT_SM;
  ws.getCell('AF8').value = `${fromDt.toFormat('dd.LL.yyyy')}-${toDt.toFormat(
    'dd.LL.yyyy',
  )}`;
  ws.getCell('AF8').font = FONT_BIG;
  ws.getCell('AF8').fill = YELLOW;
  ws.getCell('AF8').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.getCell('B10').value = 'Номер по порядку';
  ws.getCell('C10').value = 'Фамилия, инициалы';
  ws.getCell('D10').value = 'Должность';
  ws.getCell('E10').value =
    'Отметки о явках и неявках на работу по числам месяца';
  ws.getCell('AJ10').value = 'Дни';
  ws.getCell('AK10').value = 'Часы';
  for (const a of ['B10', 'C10', 'D10', 'E10', 'AJ10', 'AK10']) {
    ws.getCell(a).font = FONT_SM;
    ws.getCell(a).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    ws.getCell(a).border = THIN;
  }

  for (let d = 1; d <= 31; d++) {
    const cell = ws.getCell(11, 5 + (d - 1));
    cell.value = inPeriod.has(d) ? d : null;
    cell.font = FONT_SM;
    cell.alignment = { horizontal: 'center' };
    cell.border = THIN;
  }

  const START = 13;
  staff.forEach((s, i) => {
    const r = START + i;
    ws.getCell(r, 2).value = i + 1;
    ws.getCell(r, 3).value = s.fullName;
    ws.getCell(r, 4).value = s.position || '';
    let presentCount = 0;
    for (const iso of days) {
      const day = Number(iso.slice(-2));
      const cell = ws.getCell(r, 5 + (day - 1));
      const letter = statusLetter(map.get(`${s.id}::${iso}`));
      cell.value = letter;
      cell.alignment = { horizontal: 'center' };
      cell.font = FONT_CELL;
      cell.border = THIN;
      if (letter === 'Я') presentCount++;
    }
    for (let d = 1; d <= 31; d++) {
      if (!inPeriod.has(d)) ws.getCell(r, 5 + (d - 1)).border = THIN;
    }
    ws.getCell(r, 36).value = presentCount;
    ws.getCell(r, 37).value = presentCount * workHours;
    for (const c of [2, 3, 4, 36, 37]) {
      ws.getCell(r, c).border = THIN;
      ws.getCell(r, c).alignment = {
        horizontal: c <= 4 ? 'left' : 'center',
        vertical: 'middle',
      };
    }
  });

  const ab = await wb.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(ab),
    filename: `tabel-${slug(org.name)}-${from}-${to}.xlsx`,
  };
}
