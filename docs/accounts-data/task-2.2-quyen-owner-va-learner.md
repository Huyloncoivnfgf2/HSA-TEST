# Task 2.2 — Thiết lập quyền Owner và Learner

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 2 — Tài khoản, phân quyền và dữ liệu  
**Liên quan:** Task 2.1 (mô hình tài khoản/vai trò), Task 0.2 (Owner và Learner), Task 1.6 (tính năng cũ cần giữ)  
**Bằng chứng đã kiểm tra trực tiếp ngày 2026-10-09:** `src/App.tsx`, `src/components/Header.tsx`, `src/components/PdfExamLibrary.tsx`, `src/components/PdfExamPlayer.tsx`, `src/components/AllowedUsersModal.tsx`.  
**Email Owner:** do bạn cung cấp (lưu ngoài tài liệu này); tài liệu không ghi email cá nhân lên GitHub.

---

## 1. Mục đích

Chốt và kiểm tra: Owner được làm gì thêm so với Learner, Learner được dùng gì để học, và các nút quản lý nội dung có đang bị lộ cho Learner hay không. Quyền ở giao diện chỉ là lớp ngoài; quyền thật phía máy chủ/RLS thuộc Task 2.3.

## 2. Bảng quyền chốt cho Giai đoạn 2

| Việc | Owner | Learner | Căn cứ |
|---|---:|---:|---|
| Vào web sau khi đăng nhập Google | Có | Có, nếu email đã được duyệt | Task 2.1 |
| Học/làm bài từ thư viện PDF, xem lại bài của mình | Có | Có | Luồng học chung |
| Học từ ngân hàng câu hỏi có sẵn (ôn tập/kiểm tra theo câu) | Có | Có | Tính năng di sản đang giữ ở Task 1.6; Learner chỉ học, không quản trị nội dung |
| Thêm đề PDF, đẩy đề lên cloud, nhập/sửa đáp án, đổi tên, xóa đề | Có | Không | `PdfExamLibrary` đã bọc các nút này theo `isAdmin` |
| Quản lý email được duyệt (màn hình Người dùng) | Có | Không | `Header` và `App.tsx` đã bọc theo `isAdmin` |
| Sửa đáp án sau khi nộp để chấm lại (trong màn hình làm bài PDF) | Có | Không | `PdfExamPlayer` đã bọc theo `isAdmin` |
| Quản lý ngân hàng câu hỏi: xem tất cả để sửa/xóa/reset, nhập bằng AI, nhập từ Google Drive | **Có** | **Không** | Đây là quản trị nội dung. Trước task này còn lộ nút cho Learner; đã sửa trong Task 2.2 |
| Sao lưu/khôi phục dữ liệu trên thiết bị của chính mình | Có | Có | Dữ liệu cá nhân tại máy, không phải quản trị nội dung cloud |

## 3. Điểm đã đúng sẵn (không sửa)

- Thư viện PDF đã phân quyền khá sạch: nút đẩy cloud, thêm đề, nhập đáp án, đổi tên, xóa đề chỉ hiện với `isAdmin`; Learner chỉ thấy làm bài/xem lại.
- Màn hình “Người dùng” chỉ hiện với Owner ở cả thanh đầu trang và phần lắp modal.
- Trong màn hình làm bài PDF, nút sửa đáp án sau khi nộp chỉ hiện với Owner. Learner sau khi nộp chỉ xem đáp án theo đáp án máy chủ trả về, không tự sửa khóa chấm.

## 4. Điểm thiếu đã sửa trong Task 2.2

Trước khi sửa, các lối vào quản trị ngân hàng câu hỏi cũ vẫn hiện cho mọi tài khoản đã duyệt: nút “Ngân hàng”, “Nhập bằng AI”, “Drive” trên thanh đầu trang; nút “Nhập bằng AI” ở banner chính; và liên kết “Xem tất cả câu hỏi” mở màn hình sửa/xóa câu hỏi. Điều này lệch với quyền chốt ở mục 2: Learner được học từ nội dung có sẵn nhưng không quản trị nội dung.

Đã sửa nhỏ, chỉ ở lớp giao diện:

1. `Header.tsx`: chỉ Owner mới thấy các nút Ngân hàng câu hỏi, Nhập bằng AI và Google Drive.
2. `App.tsx`: chỉ Owner mới thấy nút Nhập bằng AI ở banner và liên kết “Xem tất cả câu hỏi”.
3. `App.tsx`: ba modal quản trị nội dung (nhập dữ liệu AI, quản lý ngân hàng câu hỏi, Google Drive) chỉ được lắp khi là Owner, để Learner không mở được kể cả khi trạng thái giao diện bị lệch.

Không sửa dữ liệu, không sửa Supabase, không thay đổi cách Learner học từ thư viện PDF hay ngân hàng câu hỏi có sẵn.

## 5. Giới hạn trung thực của Task 2.2

- Đây là phân quyền **giao diện**. Nếu ai đó gọi thẳng dữ liệu/máy chủ, lớp chặn thật phải nằm ở Supabase RLS và máy chủ; việc đối chiếu đó thuộc Task 2.3.
- Các đường AI cũ phía máy chủ (`/api/gemini/...`) chưa được gắn kiểm tra vai trò trong task này. Task 2.2 chỉ đóng lối vào trên giao diện cho Learner; Task 2.3 phải ghi nhận rõ đây là điểm cần quyết định khi rà soát phía server.
- Owner được xác định bằng email trong `admins`. Tài liệu này không ghi email Owner thật lên GitHub; khi nghiệm thu, bạn dùng đúng tài khoản Owner của mình để kiểm tra.

## 6. Tiêu chí nghiệm thu Task 2.2

- [x] Bảng quyền Owner/Learner đã chốt và đối chiếu với code thật.
- [x] Các nút quản trị nội dung PDF và người dùng đã kiểm tra: chỉ Owner thấy.
- [x] Đã sửa các lối vào quản trị ngân hàng câu hỏi cũ còn lộ cho Learner.
- [ ] (Bạn kiểm trên web sau khi Render cập nhật) Tài khoản Owner: vẫn thấy Thêm đề, Người dùng, Ngân hàng, Nhập AI, Drive như trước.
- [ ] (Bạn kiểm trên web sau khi Render cập nhật) Tài khoản Learner: vẫn học/làm bài được, nhưng không thấy Người dùng, Thêm đề, Ngân hàng, Nhập AI, Drive.
- [ ] (Bạn kiểm thêm) Tài khoản chưa duyệt: vẫn bị chặn ở màn hình chờ như Task 2.1.

**Kết luận Task 2.2:** Quyền Owner/Learner ở lớp giao diện đã được chốt và sửa điểm còn lộ. Chưa coi là nghiệm thu xong cho đến khi bạn kiểm tra bằng tài khoản Owner và Learner thật sau khi web cập nhật.
