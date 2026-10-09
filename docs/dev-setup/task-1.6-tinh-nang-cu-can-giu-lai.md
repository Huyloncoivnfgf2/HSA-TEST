# Task 1.6 — Liệt kê các tính năng cũ cần giữ lại nếu có code sẵn

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 1 — Thiết lập môi trường phát triển (task cuối của Giai đoạn 1)  
**Liên quan:** Giai đoạn 0 (hướng hiện tại: thư viện PDF + Supabase), Task 1.1 (rủi ro R5/R6), Task 1.4 (file Firebase)  
**Bằng chứng đã kiểm tra trực tiếp:** `src/App.tsx` (các màn hình đang được lắp vào ứng dụng), danh sách `src/components/`, `src/services/`, `server.ts`, `vite.config.ts`.

## 1. Mục đích

Web hiện tại là bản phát triển tiếp từ bản AI Studio: tính năng mới (thư viện PDF) và nhiều tính năng cũ (ngân hàng câu hỏi/AI) đang sống chung. Trước khi sửa bất cứ thứ gì ở các giai đoạn sau, phải kê khai rõ: cái gì là **đường chính phải giữ**, cái gì là **di sản còn chạy được nhưng không phát triển tiếp**, và cái gì **chưa được quyết**. Không ai được xóa "cho gọn" khi chưa qua danh sách này.

## 2. Nguyên tắc phân loại

- **GIỮ (đường chính):** đúng hướng Giai đoạn 0, đang phục vụ việc học thật. Mọi thay đổi phải giữ chúng chạy.
- **DI SẢN — GIỮ NGUYÊN, KHÔNG MỞ RỘNG:** còn được lắp trong ứng dụng và mở ra được, nhưng không thuộc hướng phát triển. Không xóa vội (xóa có thể kéo theo lỗi dây chuyền), không thêm tính năng mới lên chúng.
- **CHƯA QUYẾT:** chưa đủ bằng chứng để giữ hay bỏ; ghi điều kiện cần kiểm tra rồi mới quyết.
- Quyết định bỏ một mục chỉ thực hiện ở một task riêng trong tương lai, có điểm an toàn Git (Task 1.2) và kiểm tra theo Task 1.5. Task 1.6 chỉ kê khai.

## 3. Nhóm GIỮ — đường chính hiện tại

Đã kiểm tra đang được lắp trong `App.tsx` và khớp thiết kế Giai đoạn 0:

| Tính năng | Thành phần chính | Vì sao giữ |
|---|---|---|
| Cổng đăng nhập Google + chặn chưa duyệt | `AuthGate` | Đúng Task 0.2 |
| Quản lý người được duyệt (Owner) | `AllowedUsersModal`, `allowedUsersService` | Đúng Task 0.2 |
| Thư viện đề PDF + thêm đề + đáp án | `PdfExamLibrary` | Hướng chính của sản phẩm |
| Làm bài trên PDF (vẽ/nháp/phiếu đáp án) | `PdfExamPlayer`, `PdfCanvasViewer`, lớp chú thích | Hướng chính |
| Nộp bài lên Supabase, lấy đáp án sau khi nộp | `cloudExamService.submitCloudExam`, `submit_exam()` | Đúng nguyên tắc không lộ đáp án |
| Sổ lỗi, lịch sử, phân tích, thẻ điểm, mục tiêu | `MistakeNotebookModal`, `ExamHistoryModal`, `SubjectAnalyticsView`, `HomeScoreCards`, `GoalSettingsModal` | Đúng Task 0.7 (có cả phần PDF qua `onOpenPdfMistake`) |
| Ôn tập FSRS | `FSRSReviewSession`, `fsrsService` | Đúng Task 0.3/0.7 |
| Đồng bộ dữ liệu cá nhân lên Supabase | `userDataSync`, `userStorage`, `SyncIndicator` | Đúng Task 1.3 mục 4 |
| Sao lưu/khôi phục dữ liệu tại máy | Trong `PdfExamLibrary` (`export/importApplicationBackup`) | Lớp khôi phục phía người dùng (Task 1.2 lớp K4) |

## 4. Nhóm DI SẢN — giữ nguyên, không mở rộng

Các mục này vẫn đang được lắp vào ứng dụng trong `App.tsx`, nên **không được coi là code chết**:

| Tính năng cũ | Thành phần chính | Lý do xếp di sản |
|---|---|---|
| Ngân hàng câu hỏi dạng từng câu (học theo câu, thi theo câu) | `StudyMode`, `ExamMode`, `storageService` (load/saveQuestions) | Sản phẩm đã chuyển hướng sang đề PDF nguyên bản (Task 0.1/0.4: không tách câu) |
| Nhập câu hỏi bằng AI Gemini (tách đề/đáp án/nhận xét) | `server.ts` + `vite.config.ts` (`/api/gemini/...`), `server/geminiHandler.ts`, `geminiClient`, `DataImportModal` | Đã loại khỏi hướng chính vì hay lỗi 503/timeout (kinh nghiệm của bạn); giữ để không phá các luồng cũ còn tham chiếu |
| Quản lý/sửa câu hỏi lẻ | `QuestionManagerModal`, `QuestionEditModal`, `ClusterPassageCard`, `AnnotatedText`, `MathRenderer` | Phục vụ ngân hàng câu hỏi ở trên |
| Nhập/xuất qua Google Drive cho ngân hàng câu hỏi | `GoogleDriveModal`, `googleDriveService` | Kênh nhập liệu cũ, không thuộc hướng PDF/Supabase |
| Đăng nhập/dữ liệu kiểu Firebase | `firebaseAuth`, `firebase-applet-config.json` | Hệ đăng nhập chính hiện là Supabase (`AuthGate`); chưa đủ bằng chứng gỡ — xem nhóm CHƯA QUYẾT |
| Câu lệnh/thừa nhỏ trong cấu hình | Lệnh `clean` xóa `server.js`, mô tả "trích xuất bằng AI" trong `index.html` | R5/R6 của Task 1.1; chỉ là chữ/lệnh thừa, sửa khi có task riêng, không tiện tay sửa trong task khác |

## 5. Nhóm CHƯA QUYẾT — cần kiểm tra trước khi đụng vào

| Mục | Điều cần kiểm tra | Quyết định sau kiểm tra |
|---|---|---|
| `firebaseAuth` còn được màn hình nào gọi không, hay chỉ `AuthGate` (Supabase) là cổng duy nhất | Tìm mọi nơi dùng `firebaseAuth` trong `src/` | Nếu không nơi nào dùng: đưa vào diện gỡ ở task riêng (kèm gỡ file cấu hình Firebase theo Task 1.4). Nếu còn dùng: ghi rõ dùng ở đâu vào bảng DI SẢN |
| Chế độ học/thi theo ngân hàng câu hỏi còn được bạn dùng thật không | Hỏi chính bạn (người dùng thật duy nhất biết) + xem dữ liệu câu hỏi mặc định còn được mở không | Nếu không dùng nữa: giữ nguyên code nhưng cân nhắc ẩn khỏi giao diện ở giai đoạn thiết kế giao diện sau — ẩn giao diện trước, xóa code sau, hai bước tách riêng |
| Các đường `/api/gemini/*` còn tính năng nào trên giao diện gọi tới | Lần theo nút Nhập dữ liệu/AI trên giao diện vào `DataImportModal` | Còn gọi: giữ máy chủ như hiện tại. Không còn gọi: vẫn chưa tắt trong Giai đoạn 1; ghi vào danh sách tắt ở giai đoạn dọn dẹp riêng |

## 6. Hệ quả cho các giai đoạn sau (ràng buộc cứng)

1. Sửa tính năng thuộc nhóm GIỮ: kiểm tra theo bảng dây chuyền ở Task 1.5 mục 4.
2. Không task nào được xóa/di chuyển thành phần thuộc nhóm DI SẢN hoặc CHƯA QUYẾT "nhân tiện". Muốn dọn phải là task riêng, có điểm an toàn, có kiểm tra sau dọn.
3. Khi code mới và code cũ cùng chạm một dữ liệu (ví dụ Sổ lỗi dùng cho cả PDF và ngân hàng câu hỏi), mặc định giữ tương thích cả hai cho đến khi có quyết định ở mục 5.

## 7. Tiêu chí nghiệm thu Task 1.6

- [x] Kê khai đủ 3 nhóm GIỮ / DI SẢN / CHƯA QUYẾT dựa trên những gì đang lắp trong `App.tsx`, không đoán code chết.
- [x] Mỗi mục ghi rõ thành phần và lý do phân loại.
- [x] Mục chưa quyết ghi điều kiện kiểm tra cụ thể thay vì kết luận vội.
- [x] Ràng buộc cho giai đoạn sau: không xóa nhân tiện.

**Kết luận Task 1.6 và Giai đoạn 1 (thiết kế/hồ sơ):** Đã kê khai xong. Các việc thực thi còn nợ (diễn tập chạy/dựng thử, diễn tập khôi phục, đối chiếu biến trên Render, sửa lỗi "Invalid key", bổ sung cột đề nhiều phần) được tổng hợp ở báo cáo rà soát Giai đoạn 1 và chuyển thành việc code ở giai đoạn sau — không coi là đã làm chỉ vì đã viết tài liệu.
