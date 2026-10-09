# Task 5.6 — Quản lý trạng thái xử lý báo lỗi

**Giai đoạn:** 5 — Báo lỗi nội dung

## Luồng trạng thái

`Chờ xử lý` → `Đã xác nhận lỗi` / `Cần thêm thông tin` / `Không phải lỗi` / `Đã sửa xong` / `Trùng báo lỗi khác`.

Owner đổi trạng thái ngay trong hàng đợi. Khi chuyển sang Đã sửa xong, hệ thống ghi thời điểm hoàn tất. Các trạng thái Chờ xử lý, Đã xác nhận và Cần thêm thông tin được coi là “đang mở” phục vụ chống trùng ở Task 5.8.
