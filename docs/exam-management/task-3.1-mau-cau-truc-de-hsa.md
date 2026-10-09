# Task 3.1 — Xây dựng mẫu cấu trúc đề HSA

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 3 — Quản lý đề thi  
**Mức độ cẩn trọng:** Cao. Đây là mẫu gốc để các task 3.2–3.9 bám vào; sai ở đây sẽ kéo sai toàn bộ quản lý đề, chấm điểm và điều kiện dùng đề.  
**Bằng chứng đã kiểm tra trực tiếp ngày 2026-10-09:** `src/types/hsa.ts` (SUBJECT_CONFIGS), `src/types/pdfExam.ts`, `src/components/PdfExamLibrary.tsx`, `src/components/PdfCanvasViewer.tsx`, `src/services/cloudExamService.ts`, `supabase/schema.sql`.

---

## 1. Mẫu cấu trúc chuẩn của một đề HSA trong hệ thống

Một “đề” trong web được quản lý theo **từng phần thi**, không phải một cục không rõ ranh giới. Mẫu chuẩn:

| Thuộc tính | Định lượng | Định tính | Khoa học |
|---|---|---|---|
| Mã phần trong hệ thống | `dinh_luong` / giao diện `math` | `dinh_tinh` / giao diện `literature` | `khoa_hoc` / giao diện `science` |
| Tên hiển thị | Phần 1: Tư duy định lượng (Toán học) | Phần 2: Tư duy định tính (Ngữ văn - Tiếng Việt) | Phần 3: Khoa học (Tự nhiên & Xã hội) |
| Số câu chuẩn | 50 | 50 | 50 |
| Thời lượng chuẩn | 75 phút | 60 phút | 60 phút |
| Điểm | 1 điểm/câu đúng | 1 điểm/câu đúng | 1 điểm/câu đúng |
| Nguồn nội dung hiện tại | PDF nguyên bản | PDF nguyên bản | PDF nguyên bản |

Ba giá trị số câu/thời lượng trên đã có sẵn trong `SUBJECT_CONFIGS` và khớp với cấu trúc HSA đã chốt từ Giai đoạn 0. Đây là **mẫu chuẩn**, không phải giới hạn cứng cho mọi file: hệ thống hiện vẫn cho phép số câu khác 50 để chứa đề lẻ/đề rút gọn, nhưng khi một đề được coi là “đề HSA chuẩn cho lượt thi mới” ở Task 3.9 thì phải đối chiếu với mẫu này.

## 2. Một bản ghi đề gồm những gì

Ở mức tối thiểu, một bản ghi đề phải trả lời được 6 câu hỏi:

1. **Thuộc phần nào?** Một trong ba phần ở mục 1.
2. **Tên đề là gì?** Tên đẹp do Owner đặt, hiển thị cho người học.
3. **File nội dung ở đâu?** Đường file PDF trong kho lưu trữ; tên file gốc chỉ là thông tin phụ, không dùng làm khóa lưu trữ (bài học từ lỗi Invalid key).
4. **Có bao nhiêu câu và đánh số từ đâu?** Số câu của phần này; với đề nhiều phần chung một file, cần thêm số câu bắt đầu của phần (ví dụ phần Khoa học bắt đầu ở câu 101 trong một đề gộp) — hiện chưa có, thuộc Task 3.2/3.3.
5. **Đáp án và lời giải ở đâu?** Đáp án lưu tách khỏi đề và chỉ trả sau khi nộp; lời giải là tài liệu riêng, không trộn vào file đề.
6. **Đề đã đủ điều kiện dùng chưa?** Trạng thái hoàn thiện/xác minh thuộc Task 3.6–3.9, không tự suy ra chỉ từ việc file đã tải lên.

## 3. Trường hợp đặc biệt: một PDF chứa nhiều phần

Mẫu xử lý đã chốt từ trước và giữ nguyên:

- Chỉ lưu **một file PDF gốc** cho cả đề gộp.
- Mỗi phần vẫn là **một bản ghi đề riêng** để người học chọn phần, tính giờ và chấm theo phần.
- Các bản ghi cùng một file phải liên kết với nhau bằng định danh file chung, và mỗi bản ghi cần biết: khoảng trang của phần mình (`page_start`–`page_end`) và số câu bắt đầu (`start_question`).
- Không cắt file thành nhiều PDF con nếu không cần; trình xem sẽ hiển thị đúng khoảng trang của phần được chọn.

Hiện tại code/schema **chưa có** các trường khoảng trang/số câu bắt đầu/định danh file chung; trình xem PDF đang hiển thị toàn bộ file. Vì vậy mẫu ở mục này là chuẩn đích cho Task 3.2 (quản lý PDF/tài liệu nguồn) và Task 3.3 (câu hỏi/dữ liệu chung/cụm), không được nói là đã có.

## 4. Quy tắc đánh số và chấm theo mẫu

- Trong một phần, câu được đánh số liên tục từ số bắt đầu của phần đến số bắt đầu + số câu − 1.
- Với đề một phần độc lập, số bắt đầu mặc định là 1.
- Đáp án nhập theo đúng số câu hiển thị của phần; chuẩn hóa đáp án và quy tắc chấm chi tiết thuộc Task 3.4.
- Câu chưa có đáp án chuẩn thì chưa tính vào điểm tối đa có thể chấm (hành vi hiện tại của hệ thống), và đề như vậy chưa đạt điều kiện “sẵn sàng cho lượt thi mới” ở Task 3.9.

## 5. Đối chiếu hiện trạng và việc phân cho các task sau

| Nội dung mẫu | Hiện trạng đã kiểm tra | Task xử lý |
|---|---|---|
| 3 phần, 50 câu, 75/60/60 phút | Đã có trong cấu hình giao diện; form thêm đề mặc định 50 câu nhưng vẫn cho sửa 1–5000 | Giữ; điều kiện “đề chuẩn” chốt ở 3.9 |
| File PDF + tên đề + phần + số câu trên cloud | Đã có (`exams`: title/section/question_count/pdf_path) | 3.2 rà soát quản lý file |
| Đáp án tách riêng, trả sau khi nộp | Đã có (`exam_keys` + `submit_exam()`) | 3.4 quy tắc chấm |
| Lời giải tách riêng | Đã có đường file lời giải và cổng đọc sau khi nộp | 3.5 |
| Khoảng trang, số câu bắt đầu, file chung cho đề gộp | **Chưa có** trong schema và trình xem | 3.2 + 3.3 |
| Trạng thái hoàn thiện/xác minh, duyệt đề, phiên bản | Chưa có mẫu trong `exams` | 3.6–3.8 |
| Điều kiện được dùng cho lượt thi mới | Chưa có cổng kiểm tra riêng | 3.9 |

## 6. Tiêu chí nghiệm thu Task 3.1

- [x] Chốt mẫu 3 phần với số câu, thời lượng, điểm/câu từ cấu hình thật của dự án.
- [x] Định nghĩa một bản ghi đề phải có những gì, tách rõ đề/đáp án/lời giải.
- [x] Chốt mẫu cho PDF nhiều phần: một file gốc, nhiều bản ghi theo phần, cần khoảng trang và số câu bắt đầu.
- [x] Phân rõ phần đã có và phần chưa có cho đúng task sau, không gộp sửa vội trong 3.1.
- [ ] (Kiểm lại ở 3.9) Khi cổng “đề đủ điều kiện dùng” được xây, đối chiếu nó với mẫu ở mục 1–4.

**Kết luận Task 3.1:** Mẫu cấu trúc đề HSA đã chốt làm gốc cho Giai đoạn 3. Task này không sửa code/schema; các thiếu hụt thật (đề gộp nhiều phần, trạng thái/duyệt/phiên bản) được để đúng task 3.2–3.9 để làm tỉ mỉ từng bước.
