import { UploadedMaterial } from "@/types/dashboard";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

const decodeBinaryAsText = (arrayBuffer: ArrayBuffer): string => {
  try {
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
    return decoded.replace(/\0/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
};

const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => {
        if ("str" in item) {
          return item.str;
        }
        return "";
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      pageTexts.push(text);
    }
  }

  return pageTexts.join("\n");
};

const extractDocxText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.replace(/\s+/g, " ").trim();
};

export const extractTextFromBlob = async (
  blob: Blob,
  fileName: string,
  contentType?: string,
): Promise<string> => {
  const lowerName = fileName.toLowerCase();

  if (contentType === "text/plain" || lowerName.endsWith(".txt")) {
    return (await blob.text()).replace(/\s+/g, " ").trim();
  }

  const arrayBuffer = await blob.arrayBuffer();

  if (contentType === "application/pdf" || lowerName.endsWith(".pdf")) {
    const pdfText = await extractPdfText(arrayBuffer);
    if (pdfText) {
      return pdfText;
    }
  }

  if (
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    const docText = await extractDocxText(arrayBuffer);
    if (docText) {
      return docText;
    }
  }

  if (lowerName.endsWith(".doc")) {
    const decoded = decodeBinaryAsText(arrayBuffer);
    if (decoded.length > 40) {
      return decoded;
    }
  }

  const fallback = decodeBinaryAsText(arrayBuffer);
  if (fallback.length > 0) {
    return fallback;
  }

  return `${fileName} content could not be extracted. Please upload TXT, DOCX, or text-based PDF for best results.`;
};

const readFileAsText = async (file: File): Promise<string> => {
  return extractTextFromBlob(file, file.name, file.type);
};

const uploadToSupabaseStorage = async (userId: string, file: File): Promise<string | undefined> => {
  const path = `${userId}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage.from("study-materials").upload(path, file, {
    upsert: true,
  });

  if (error) {
    return undefined;
  }

  return path;
};

export const uploadService = {
  async toMaterial(userId: string, file: File, kind: "pyq" | "notes"): Promise<UploadedMaterial> {
    const extractedText = await readFileAsText(file);
    const storagePath = await uploadToSupabaseStorage(userId, file);

    return {
      id: `${Date.now()}-${file.name}`,
      kind,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      extractedText: extractedText.slice(0, 20000),
      createdAt: new Date().toISOString(),
      storagePath,
    };
  },
};
