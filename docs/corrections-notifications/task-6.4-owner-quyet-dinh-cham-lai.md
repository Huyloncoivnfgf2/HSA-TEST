# Task 6.4 — Để Owner quyết định có chấm điểm lại hay không

**Giai đoạn:** 6 — Sửa lỗi và thông báo | **Liên quan:** Task 6.1–6.3

## Đã làm

- Trong màn hình sửa đáp án sau khi nộp, Owner chọn một trong hai cách trước khi lưu:
  - **Chỉ áp dụng lượt mới**: lượt đã nộp giữ nguyên điểm và bộ đáp án lúc nộp.
  - **Chấm lại lượt đã nộp**: tạo phiên bản mới, thay ảnh chụp đáp án của lượt cũ bằng đáp án đã sửa và tính lại điểm.
- Nếu lúc sửa chưa quyết định, bản sửa ở trạng thái `pending`; Owner quyết định sau trong mục **Sửa lỗi và quyết định chấm lại** của hàng đợi Báo lỗi.
- Khi chấm lại:
  - điểm gốc được giữ ở `originalScore`;
  - lịch sử và Sổ lỗi của người học được dựng lại từ kết quả mới khi họ mở lại lượt làm;
  - lượt kiểm thử nội dung chỉ cập nhật điểm của chính lượt đó, không vào lịch sử học thật.
- Nút **Tôi đúng** cho đáp án điền nay chỉ tính đúng cho đúng lượt đang xem. Nó không còn sửa đáp án chuẩn cho cả đề và không tự chấm lại các lượt khác.

## Nguyên tắc an toàn

Không có thao tác sửa đáp án nào tự động chấm lại toàn bộ lượt cũ nếu Owner chưa chọn “Chấm lại”. Đây là thay đổi có chủ đích so với hành vi cũ trong màn hình sửa đáp án.
