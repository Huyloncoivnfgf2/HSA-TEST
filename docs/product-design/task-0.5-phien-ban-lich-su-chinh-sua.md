# Task 0.5 — Thiết kế cơ chế phiên bản và lịch sử chỉnh sửa

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 0 — Thiết kế sản phẩm
**Liên quan:** Task 0.4 (mô hình đề) | Hiện có: cột `created_at`, `updated_at` và trigger tự cập nhật trên bảng `exams`

## 1. Mục đích
Khi Owner sửa đề/đáp án, hệ thống phải biết "đã sửa cái gì, lúc nào", để: tránh chấm sai cho người đã nộp trước đó, và khôi phục được khi sửa nhầm. Làm ở mức vừa đủ cho nhóm nhỏ, không xây hệ thống quản lý phiên bản phức tạp.

## 2. Nguyên tắc chốt
1. **Bài đã nộp không bao giờ bị chấm lại** theo đáp án mới. Điểm đã công bố giữ nguyên như lúc nộp.
2. Mọi sửa đổi quan trọng (đổi file đề, đổi đáp án) đều để lại dấu vết: ai sửa, lúc nào, sửa phần nào.
3. Không xóa cứng dữ liệu học tập (bài nộp, lịch sử) khi sửa/xóa đề; xóa đề phải được xác nhận và cân nhắc ảnh hưởng.
4. Người học không cần thấy lịch sử sửa; đây là công cụ cho Owner.

## 3. Cơ chế cụ thể

### 3.1. Đánh dấu phiên bản nhẹ cho mỗi đề
- Mỗi đề có thời gian tạo và **thời gian sửa gần nhất** (đã có sẵn, tự cập nhật khi sửa).
- Khi Owner đổi đáp án hoặc đổi file PDF: coi là **sửa lớn** → cập nhật thời gian sửa và ghi 1 dòng nhật ký (mục 3.2).
- Sửa nhỏ (đổi tên hiển thị) chỉ cập nhật thời gian sửa, không cần nhật ký chi tiết.

### 3.2. Nhật ký chỉnh sửa (mức tối thiểu cần có)
Mỗi dòng nhật ký gồm: thời gian, người sửa (Owner), mã đề, loại thay đổi, ghi chú ngắn.
Loại thay đổi chốt:
- `them_de` — thêm đề mới
- `doi_file` — thay file PDF đề/lời giải
- `doi_dap_an` — sửa bảng đáp án đúng
- `doi_thong_tin` — sửa tên/phần thi/số câu/trang
- `xoa_de` — xóa đề (ghi tên đề trước khi xóa)

> Hiện schema chưa có bảng nhật ký riêng; đây là việc cần bổ sung ở giai đoạn code nếu Owner muốn xem lại lịch sử. Trước mắt, `updated_at` là dấu vết tối thiểu đã hoạt động.

### 3.3. Ảnh hưởng tới người học
- Người đang làm dở khi Owner sửa đề: bài làm tạm giữ nguyên; khi nộp, chấm theo đáp án **tại thời điểm nộp** và ghi rõ thời điểm đó trong bài nộp.
- Nếu Owner sửa đáp án vì đáp án cũ sai: điểm các bài đã nộp trước **không tự đổi**; Owner thông báo cho nhóm và người học có thể làm/nộp lại.
- Đáp án trong Sổ lỗi luôn lấy theo lần nộp gần nhất của chính người học.

## 4. Khôi phục khi sửa nhầm
- Trước khi Owner sửa lớn, giao diện cần bước xác nhận (hiện đã có mẫu ConfirmationModal).
- File PDF cũ trên cloud chỉ bị thay khi Owner chủ động tải file mới; khuyến nghị Owner giữ bản sao file gốc trên máy (đã có file backup theo lời Owner).
- Nếu sửa nhầm đáp án: Owner nhập lại đáp án đúng; các lần nộp sau đó chấm đúng ngay.

## 5. Tiêu chí nghiệm thu Task 0.5
- [x] Nguyên tắc: bài đã nộp không chấm lại; sửa lớn phải có dấu vết.
- [x] Danh sách loại thay đổi cần ghi nhật ký.
- [x] Quy tắc xử lý khi sửa đề/đáp án giữa chừng.
- [x] Cách khôi phục khi sửa nhầm (xác nhận trước, giữ file gốc).

**Kết luận:** Cơ chế phiên bản ở mức nhẹ, đủ an toàn cho nhóm nhỏ. Sang Task 0.6.

---
**Ghi chú rà soát (2026-10-09) — phát hiện quan trọng, ghi nhận để sửa ở giai đoạn code:**
1. Bảng `exam_submissions` hiện chỉ lưu **đáp án người học**, chưa lưu điểm/kết quả từng câu/ảnh chụp đáp án đúng tại thời điểm nộp. Nếu Owner sửa đáp án rồi người học mở lại bài cũ, hệ thống có nguy cơ hiểu lại bài cũ theo đáp án mới — trái với Nguyên tắc 1 ở trên. Muốn giữ đúng nguyên tắc, khi code cần lưu thêm kết quả chấm (đúng/sai từng câu hoặc điểm) ngay lúc nộp.
2. Trong schema hiện tại, xóa 1 đề sẽ **xóa theo** bài nộp của đề đó (quan hệ xóa dây chuyền). Điều này lệch với Nguyên tắc 3 "không xóa cứng dữ liệu học tập". Hướng chốt: ưu tiên **ẩn/lưu trữ đề (xóa mềm)** thay vì xóa cứng; nếu vẫn xóa cứng thì phải cảnh báo rõ sẽ mất lịch sử làm bài của đề đó.
3. Nhật ký chỉnh sửa (mục 3.2) chưa có bảng riêng trong schema — vẫn là việc cần bổ sung, chưa coi là đã xong.
