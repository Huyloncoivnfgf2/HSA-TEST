# Task 10.4 — Tối ưu tương tác trên điện thoại

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 10 — Responsive, mobile và PWA  
**Trạng thái:** hoàn thành ngày 2026-10-10; code đã push trong commit `66ba0b9` "feat: improve mobile touch interactions (Task 10.4)", tài liệu bổ sung trong commit "docs: add Task 10.4 report".

## 1. Khảo sát và phân loại

**Đã xác nhận trong code (đã sửa):**

- Nhiều điều khiển dùng hằng ngày trên điện thoại có vùng bấm dưới chuẩn chạm: nút chọn đáp án A–D (~36px), nút chuyển chế độ Trắc nghiệm/Điền (~28px), các nút Báo lỗi/Cờ/Gắn trang (~26px), nút quay lại và đóng phiếu đáp án (32px), 6 nút công cụ chính của thanh vẽ (~36px), các nút Hoàn tác/Làm lại/Xoá/Hiện-ẩn ghi chú (28px), nút thu gọn thanh công cụ mobile (~22px), các nút trên Header (~32px).
- Ô nhập đáp án điền, ô nhãn chương, các ô chọn/mô tả trong form báo lỗi dùng cỡ chữ 14px — trên iOS, trình duyệt tự phóng to khi chạm vào ô có chữ dưới 16px, dễ làm lệch bố cục đang làm bài.
- Nút mở phiếu đáp án nổi ở góc dưới chưa tính vùng an toàn của iPhone (thanh home).

**Đã xác nhận là đúng cơ chế, không cần sửa code:**

- Vẽ ghi chú dùng sự kiện pointer + khoá cuộn (`touch-action: none`) chỉ khi đang bật công cụ vẽ; cuộn trang vẫn hoạt động khi ở chế độ trỏ. Dữ liệu và cách lưu ghi chú không đổi.
- Lưới số câu đã có chiều cao tối thiểu 48px; các thẻ thư viện không có thao tác nào chỉ hiện khi hover (hover chỉ dùng cho hiệu ứng mũi tên trang trí).

**Nghi vấn — cần điện thoại thật, không tự kết luận:**

- Bàn phím ảo có che nút Lưu/Xác nhận trong từng modal không (khung modal đã giới hạn theo chiều cao khả dụng và cuộn trong, nhưng hành vi bàn phím khác nhau theo trình duyệt/thiết bị).
- Độ mượt và độ chính xác khi vẽ bằng ngón tay, cử chỉ zoom 2 ngón trên PDF.
- Thanh công cụ vẽ dạng pill và thanh mobile có cùng hiển thị trên điện thoại hay không (cần nhìn trực tiếp; mình không tự thay đổi logic hiển thị này trong task).

## 2. Thay đổi đã thực hiện (chỉ class hiển thị)

- `src/components/Header.tsx`: các nút trên thanh điều hướng cao tối thiểu 40px.
- `src/components/PdfExamPlayer.tsx`: nút quay lại/đóng phiếu đáp án đạt 40px; nút A–D cao 44px; nút chuyển chế độ và các nút Báo lỗi/Cờ/Gắn trang/Tôi đúng được nâng vùng bấm; ô điền đáp án và ô nhãn chương dùng chữ 16px trên điện thoại (giữ nguyên từ màn hình sm trở lên); nút mở phiếu đáp án tôn trọng vùng an toàn iPhone.
- `src/components/ExamToolbar.tsx`: 6 nút công cụ chính cao tối thiểu 40px; các nút icon Hoàn tác/Làm lại/Xoá/Hiện-ẩn đạt 36px; nút thu gọn và nút Bảng nháp của thanh mobile được phóng vùng bấm.
- `src/index.css`: lớp ô nhập dùng chung `.input-field` dùng chữ 16px trên điện thoại, trở lại cỡ thường từ sm.
- `src/components/PdfContentReportModal.tsx`: các ô chọn và ô mô tả báo lỗi cùng quy tắc 16px trên điện thoại.

## 3. Kiểm tra

- `bun run test`: 26 đạt, 0 lỗi. `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.
- Đối chiếu nội dung với GitHub: chỉ 5 file trên khác (cộng `bun.lock` dơ từ trước, không thuộc task).
- Không có môi trường kiểm tra cảm ứng/thiết bị thật trong task này — các mục "Nghi vấn" ở trên vẫn chờ xác nhận trên điện thoại.

## 4. Xác nhận phạm vi

Không thay đổi logic đăng nhập/phân quyền/làm bài/đồng hồ/đáp án/tính điểm/lịch sử/báo lỗi/thông báo; không sửa schema/RLS; không triển khai PWA/offline; không cài package mới.
