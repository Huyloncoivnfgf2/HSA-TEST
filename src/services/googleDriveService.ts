import { Question } from '../types/hsa';

export interface DriveFileItem {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

export async function listHsaFilesFromDrive(accessToken: string): Promise<DriveFileItem[]> {
  const query = encodeURIComponent("name contains 'hsa' or name contains 'HSA' or mimeType = 'application/json'");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi tải danh sách tệp Google Drive: ${errorText}`);
  }

  const data = await response.json();
  return data.files || [];
}

export async function uploadQuestionBankToDrive(
  accessToken: string,
  questions: Question[],
  customName?: string
): Promise<{ id: string; name: string }> {
  const fileName = customName || `HSA_QuestionBank_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  const fileContent = JSON.stringify(questions, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Bộ câu hỏi ôn thi ĐGNL HSA ĐHQGHN tạo bởi HSA Prep App',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi tải lên Google Drive: ${errorText}`);
  }

  const data = await response.json();
  return { id: data.id, name: data.name };
}

export async function downloadFileFromDrive(accessToken: string, fileId: string): Promise<Question[]> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi đọc tệp từ Google Drive: ${errorText}`);
  }

  const json = await response.json();
  if (!Array.isArray(json)) {
    throw new Error('Định dạng tệp không phải danh sách câu hỏi hợp lệ.');
  }

  return json as Question[];
}

export async function deleteFileFromDrive(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi xoá tệp trên Google Drive: ${errorText}`);
  }
}
