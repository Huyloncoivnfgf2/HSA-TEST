# Task 8.5 — Đề xuất hoạt động học tập tiếp theo

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 8 — Dashboard và tiến độ học tập  
**Liên quan:** Task 8.2/8.4 (chuyên đề yếu có đủ dữ liệu, độ tin cậy), Task 8.6/8.7 (mục tiêu và cảnh báo)

## 1. Hiện trạng đã kiểm tra

- Trang chủ đã có một banner "Chuyên đề cần học nhất hôm nay" (chuyên đề yếu nhất có đủ dữ liệu) nối tới luyện riêng chuyên đề. Ngoài banner đó, Dashboard không gợi ý bước tiếp theo nào khác: Sổ lỗi tồn nhiều câu, mục tiêu câu hôm nay chưa đạt, chuỗi ngày học bị đứt, hay một phần chưa từng có bài đều không được nhắc.

## 2. Đã làm

- Thêm mục **"Hoạt động học tiếp theo gợi ý"** trên trang chủ (tối đa 4 gợi ý), suy ra từ dữ liệu học thật:
  - Phần chưa có bài nào: gợi ý làm bài Kiểm tra đầu tiên của phần đó.
  - Chuyên đề yếu nhất có đủ dữ liệu (kế thừa cổng dữ liệu của Task 8.2, không lấy nhóm "Tổng hợp"): gợi ý luyện ngay chuyên đề đó.
  - Sổ lỗi có từ 5 câu đang chờ: gợi ý mở Sổ lỗi ôn theo FSRS.
  - Hôm nay chưa đạt mục tiêu số câu: hiện rõ còn thiếu bao nhiêu câu.
  - Chuỗi ngày học đang bằng 0 nhưng đã có lịch sử: gợi ý bắt đầu lại bằng một phiên ngắn.
- Mỗi gợi ý có nút hành động tương ứng (Luyện ngay / Mở Sổ lỗi / Chọn bài). Gợi ý chuyên đề trùng với banner "cần học nhất hôm nay" được loại khỏi danh sách để không hiện hai lần.

## 3. Kiểm tra

- `bun run build`: đạt. `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`.

## 4. Nghiệm thu trên web

- [ ] Tài khoản chưa làm phần nào: thấy gợi ý làm bài đầu tiên của phần đó.
- [ ] Khi Sổ lỗi có nhiều câu hoặc hôm nay chưa đạt mục tiêu câu: thấy gợi ý tương ứng và bấm được tới đúng chỗ.

**Kết luận Task 8.5:** Dashboard không chỉ hiện số liệu mà còn chỉ rõ việc nên làm tiếp theo, dựa trên chính dữ liệu của người học.
