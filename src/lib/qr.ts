import { QR_PREFIX } from "@/lib/constants";

export type ParsedQr = {
  version: string;
  type: string;
  year: number;
  classCode: string;
  number: number;
  materialCode: string;
  crc?: string;
  crcWarning?: string;
  normalizedPayload: string;
};

function crc8(input: string) {
  let crc = 0x00;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i);
    for (let j = 0; j < 8; j += 1) {
      const msb = crc & 0x80;
      crc = (crc << 1) & 0xff;
      if (msb) crc ^= 0x07;
    }
  }
  return crc;
}

export function sanitizeScanInput(raw: string) {
  return raw.replace(/[\r\n]+$/g, "").trim();
}

export function parseQrPayload(raw: string): ParsedQr {
  const sanitized = sanitizeScanInput(raw);

  if (!sanitized.startsWith(QR_PREFIX)) {
    throw new Error("不正なQRです。T4|BM| で始まるコードを読み取ってください。");
  }

  const fields = sanitized.split("|");
  if (fields.length < 6) {
    throw new Error("QRの項目数が不足しています。");
  }

  const [version, type, yearText, classCode, numberText, materialCode, crcValue] = fields;

  const year = Number(yearText);
  const number = Number(numberText);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("年度の形式が不正です。");
  }

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error("出席番号の形式が不正です。");
  }

  if (!/^[A-Z0-9]+$/.test(materialCode)) {
    throw new Error("教材コードの形式が不正です。");
  }

  const parsed: ParsedQr = {
    version,
    type,
    year,
    classCode,
    number,
    materialCode,
    crc: crcValue,
    normalizedPayload: sanitized
  };

  if (crcValue) {
    const base = fields.slice(0, 6).join("|");
    const calculated = crc8(base).toString(16).toUpperCase().padStart(2, "0");
    if (crcValue.toUpperCase() !== calculated) {
      parsed.crcWarning = `CRC不一致（読取: ${crcValue} / 計算: ${calculated}）`;
    }
  } else {
    parsed.crcWarning = "CRCが含まれていません。処理は継続します。";
  }

  return parsed;
}
