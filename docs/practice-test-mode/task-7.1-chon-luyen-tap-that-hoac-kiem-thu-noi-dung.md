# Task 7.1 — Cho phép chọn Luyện tập thật hoặc Kiểm thử nội dung

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 7 — Chế độ luyện tập và kiểm thử nội dung  
**Liên quan:** Task 2.4 (tách lượt học thật/kiểm thử), Task 4.1 (chọn đề và chế độ làm bài), Task 7.2 (lưu chế độ cho từng lượt)

## 1. Hiện trạng đã kiểm tra

- Trước Task 7.1, hộp chọn chế độ trong thư viện PDF chỉ có một ô tích "Kiểm thử nội dung" dành cho Owner; không tích thì mặc định là lượt thật. Cách này dễ hiểu nhầm vì người dùng không thấy mình đang chọn "Luyện tập thật".
- Learner không thấy lựa chọn nào, cũng không được giải thích vì sao không dùng được Kiểm thử nội dung.

## 2. Đã làm

- Đổi ô tích thành hai lựa chọn rõ ràng trong hộp "Làm bài":
  - **Luyện tập thật** (mặc định): tính vào điểm cao nhất, lịch sử, Sổ lỗi và ôn tập FSRS.
  - **Kiểm thử nội dung**: chỉ Owner chọn được; tài khoản người học thấy lựa chọn này bị khóa kèm dòng giải thích.
- Mỗi lần mở hộp chọn chế độ, lựa chọn quay về Luyện tập thật, tránh bấm nhầm lượt kiểm thử.
- Thanh tiêu đề trong màn hình làm bài hiện rõ chế độ của lượt đang mở (ví dụ "Kiểm tra · Kiểm thử nội dung — không tính vào tiến độ học tập"), để Owner không nhầm khi đang làm dở.

## 3. Kiểm tra

- Đã chạy `bun run build`: đạt.
- `bun run lint` còn lỗi cũ ở `src/services/geminiClient.ts` (biến `data` chưa định nghĩa, có từ trước Giai đoạn 7), không phát sinh lỗi mới từ thay đổi này.

## 4. Nghiệm thu trên web (sau khi Render cập nhật)

- [ ] Owner mở một đề, thấy hai lựa chọn; chọn Kiểm thử nội dung thì bắt đầu được lượt kiểm thử.
- [ ] Learner mở một đề, thấy lựa chọn Kiểm thử nội dung bị khóa và chỉ làm được Luyện tập thật.
- [ ] Trong lúc làm bài, tiêu đề hiện đúng chế độ đã chọn.

**Kết luận Task 7.1:** Người dùng chọn chế độ một cách tường minh trước khi bắt đầu; chế độ kiểm thử vẫn chỉ dành cho Owner như Task 2.4 đã chốt.
