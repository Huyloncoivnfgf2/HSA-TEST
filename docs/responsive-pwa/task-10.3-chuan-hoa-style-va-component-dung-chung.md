# Task 10.3 — Chuẩn hóa style và component dùng chung

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 10 — Responsive, mobile và PWA  
**Trạng thái:** đã sửa và kiểm tra tại bản local; **chưa đẩy GitHub** theo yêu cầu của task.

## 1. Vấn đề style đã phát hiện (khảo sát trước khi sửa)

- Mẫu nút chính màu emerald được viết tay lặp lại hơn 25 lần với các biến thể nhỏ không nhất quán (độ đậm chữ, khoảng đệm, bóng).
- Style focus gần như vắng mặt: toàn bộ mã nguồn chỉ có 14 chỗ nhắc tới `focus:`; người dùng bàn phím hầu như không thấy được vị trí đang chọn.
- 19 file tự dựng khung modal (`fixed inset-0`...) với các biến thể nhỏ về padding, bo góc và chiều cao tối đa.
- Ô nhập liệu lặp lại cùng một chuỗi class dài ở nhiều form, mỗi nơi một biến thể nền nhẹ khác nhau.

## 2. Đã chuẩn hóa

- `src/index.css` có thêm một lớp style dùng chung (đúng cơ chế Tailwind hiện có, không thêm design system ngoài):
  - Trạng thái focus bằng bàn phím (`focus-visible`) thống nhất toàn ứng dụng; nút bị vô hiệu hóa luôn có con trỏ "không cho phép".
  - Các lớp dùng chung: `.btn-primary`, `.btn-danger`, `.btn-warning`, `.btn-secondary`, `.input-field`, `.modal-backdrop`, `.modal-panel`.
- Áp dụng vào các component tiêu biểu, giữ nguyên callback/điều kiện hiển thị/quyền truy cập:
  - `ConfirmationModal` (component xác nhận dùng chung): khung nền + nút xác nhận theo loại nguy hiểm/thường.
  - `GoalSettingsModal`: khung nền modal, 3 ô nhập phụ và nút Lưu mục tiêu.
  - `LearningInsights`: 3 nút hành động (Luyện ngay/Mở Sổ lỗi/Chọn bài).
  - `UserNotificationsBanner`: nút OK xác nhận thông báo.
- Giữ nguyên theo chủ đích, không ép chuẩn hóa: các ô nhập điểm lớn có màu riêng theo từng phần trong form mục tiêu (kèm `focus:outline-hidden` vốn có), và các panel modal có bố cục khác nhau thật sự (form cuộn dọc so với danh sách) — ép về một panel chung có nguy cơ đổi hiển thị mà không thêm giá trị ở task này.

## 3. Kiểm tra

- `bun run test`: 26 đạt, 0 lỗi.
- `bun run build`: đạt; đã xác nhận các lớp dùng chung có mặt trong CSS đóng gói.
- `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`, không phát sinh lỗi mới.
- Chưa kiểm tra trực quan trên trình duyệt/thiết bị trong task này; các component đã sửa cần được nhìn lại ở màn hình rộng và hẹp sau khi triển khai.

## 4. Xác nhận phạm vi

Không thay đổi logic nghiệp vụ nào (đăng nhập, phân quyền, làm bài, tính điểm, lưu đáp án, đồng hồ, lịch sử, báo lỗi, thông báo); không sửa schema/RLS; không triển khai PWA/offline; không cài package mới.
