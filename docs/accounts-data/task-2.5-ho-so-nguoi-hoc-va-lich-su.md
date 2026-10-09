# Task 2.5 — Xây dựng hồ sơ người học và lịch sử hoạt động

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 2 — Tài khoản, phân quyền và dữ liệu  
**Liên quan:** Task 2.1 (tài khoản/vai trò), Task 2.4 (tách lượt kiểm thử), Task 0.7 (điểm số và tiến độ)  
**Bằng chứng đã kiểm tra trực tiếp ngày 2026-10-09:** `src/components/Header.tsx`, `src/App.tsx`, `src/types/analytics.ts`, `src/components/HomeScoreCards.tsx`, `src/components/ExamHistoryModal.tsx`, `src/components/SubjectAnalyticsView.tsx`, `src/services/userDataSync.ts`.

---

## 1. Hiện trạng trước Task 2.5

Trước task này, thông tin người học đã có nhưng nằm rải rác:

- Thanh đầu trang hiện ảnh, tên/email và nút đăng xuất, nhưng chưa có nơi xem hồ sơ tổng hợp.
- Trang chủ có thẻ điểm, mục tiêu, chuỗi ngày học và phân tích theo phần.
- Lịch sử bài làm nằm trong modal Lịch sử; Sổ lỗi nằm ở modal riêng.
- Dữ liệu học được đồng bộ theo từng tài khoản qua `user_data`, nên mỗi người chỉ thấy dữ liệu của chính mình.

Thiếu một màn hình gom lại: “Tôi là ai, đang học đến đâu, gần đây đã làm gì”.

## 2. Bổ sung trong Task 2.5

Đã thêm **Hồ sơ người học** mở từ ảnh/tên tài khoản ở thanh đầu trang. Màn hình này chỉ dùng dữ liệu đã có, không tạo bảng mới:

- Tên, email và vai trò Owner/Learner.
- Số bài đã ghi nhận, tỉ lệ đúng luyện tập, chuỗi ngày học, số câu đang trong Sổ lỗi.
- Mục tiêu hiện tại: tổng điểm, từng phần, ngày thi và mục tiêu câu mỗi ngày.
- Năm hoạt động học thật gần nhất lấy từ lịch sử bài làm.

Sau Task 2.4, các lượt kiểm thử nội dung mới không còn ghi vào lịch sử học thật, nên phần “Hoạt động gần đây” không bị lẫn lượt Owner kiểm tra đề. Các bản ghi cũ tạo trước Task 2.4 không tự xóa hồi tố.

## 3. Nguyên tắc dữ liệu

- Hồ sơ chỉ hiển thị dữ liệu của tài khoản đang đăng nhập. Owner không xem hồ sơ học của Learner khác theo RLS hiện tại; nhu cầu xem tiến độ người khác không thuộc phạm vi web kín hiện tại và không được suy diễn thêm.
- Không lưu thêm thông tin cá nhân mới. Tên/ảnh/email lấy từ tài khoản Google; số liệu lấy từ lịch sử và mục tiêu đã có.
- Không biến hồ sơ thành bảng xếp hạng, không chia sẻ ra ngoài.

## 4. Tiêu chí nghiệm thu Task 2.5

- [x] Có màn hình Hồ sơ người học mở từ tài khoản ở thanh đầu trang.
- [x] Hiển thị đúng vai trò Owner/Learner theo quyền đã xác minh ở cổng đăng nhập.
- [x] Tổng hợp được số bài, tỉ lệ đúng, chuỗi học, Sổ lỗi và mục tiêu từ dữ liệu hiện có.
- [x] Hiển thị 5 hoạt động học thật gần nhất; lượt kiểm thử mới không vào danh sách này.
- [ ] (Kiểm trên web sau khi Render cập nhật) Bấm vào ảnh/tên tài khoản, xác nhận mở được Hồ sơ và số liệu khớp với trang chủ/lịch sử.
- [ ] (Kiểm bằng Learner) Hồ sơ hiện vai trò Learner và chỉ có dữ liệu của chính tài khoản đó.

**Kết luận Task 2.5 và Giai đoạn 2:** Hồ sơ người học và lịch sử hoạt động đã được gom về một nơi bằng dữ liệu sẵn có. Giai đoạn 2 hoàn thành ở mức code/tài liệu; phần còn lại là nghiệm thu trên web bằng tài khoản Owner, Learner và tài khoản chưa duyệt sau khi Render cập nhật.
