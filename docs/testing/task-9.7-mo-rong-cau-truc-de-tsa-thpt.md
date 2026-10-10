# Task 9.7 — Mở rộng cấu trúc đề cho TSA và THPT

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 9 — Kiểm thử và mở rộng  
**Liên quan:** Task 3.1 (mẫu cấu trúc đề HSA), Task 9.6 (kiểm thử hồi quy)

## 1. Hiện trạng đã kiểm tra

- Toàn bộ web đang gắn với HSA: 3 phần Định lượng/Định tính/Khoa học, mỗi phần 50 câu; bảng đề trên Supabase chỉ cho phép 3 giá trị phần thi đó. Muốn thêm đề TSA (đánh giá tư duy) hoặc THPT (tốt nghiệp) thì cần một nền dữ liệu không phá vỡ các đề HSA hiện có.

## 2. Đã làm — nền dữ liệu và registry

- Thêm một **registry hệ kỳ thi** dùng chung: HSA giữ nguyên cấu trúc hiện tại; TSA có 3 phần Tư duy Toán học/Đọc hiểu/Khoa học–Giải quyết vấn đề; THPT tách theo từng môn (Toán, Văn, Anh, tổ hợp KHTN/KHXH). Với THPT, số câu mỗi môn để trống "theo đề cụ thể" vì cấu trúc thay đổi theo năm thi — không gán cứng một con số chưa đối chiếu.
- Mỗi đề từ nay mang theo nhãn **hệ kỳ thi** (`hsa` là mặc định, nên mọi đề hiện có tự hiểu là HSA, không phải nhập lại).
- Phía Supabase: schema thêm cột hệ kỳ thi cho bảng đề với giá trị mặc định HSA. **Cần chạy lại `supabase/schema.sql` một lần** để cột này có hiệu lực; trước khi chạy, web vẫn chạy bình thường như cũ nhờ đường lùi sẵn có (chỉ là nhãn hệ chưa được lưu lên cloud).
- Mọi phòng thủ cũ giữ nguyên: đáp án vẫn không đọc trực tiếp, đề HSA hiện tại không thay đổi cách chấm hay hiển thị.

## 3. Chưa làm trong task này (bước tiếp theo đã định rõ)

- Giao diện thư viện vẫn đang chọn theo 3 phần HSA. Bước tiếp theo là thêm lựa chọn hệ kỳ thi khi Owner thêm đề và bộ lọc theo hệ trong thư viện, dùng đúng registry đã tạo ở task này. Tiêu chí xong: Owner thêm được một đề TSA với 3 phần tư duy, Learner làm và nộp như đề HSA, điểm tính theo từng phần của hệ đó.
- Phân tích Dashboard theo phần của TSA/THPT sẽ nối sau khi thư viện có đề của các hệ đó.

## 4. Kiểm tra

- Kiểm thử tự động: **26 kiểm tra đạt, 0 lỗi** (thêm nhóm kiểm tra registry: HSA giữ đúng 3×50, TSA tổng 100 câu, THPT không gán cứng số câu, hệ lạ quay về HSA).
- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.

## 5. Việc cần làm trên Supabase

- Chạy lại toàn bộ `supabase/schema.sql` một lần (giống các lần trước) để thêm cột hệ kỳ thi. Thấy **Success** là xong; không chạy lại 2 dòng thêm email quản trị/người học.

**Kết luận Task 9.7:** Nền dữ liệu đã sẵn sàng cho TSA và THPT mà không đụng vào đề HSA hiện có; phần giao diện chọn hệ là bước triển khai tiếp theo đã được định rõ tiêu chí.
