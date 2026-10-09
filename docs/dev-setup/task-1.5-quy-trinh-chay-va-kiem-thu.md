# Task 1.5 — Thiết lập quy trình chạy và kiểm thử

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 1 — Thiết lập môi trường phát triển  
**Liên quan:** Task 1.1 (lệnh chuẩn), 1.2 (điểm an toàn/hoàn tác), 1.3 (checklist sau đổi Supabase), 1.4 (đối chiếu biến môi trường), Giai đoạn 0 Task 0.8 (tiêu chí nghiệm thu A–H)  
**Bằng chứng đã kiểm tra:** `package.json` (có `dev/build/start/preview/lint`, **chưa có `test`**), chưa có `.github/` (chưa có kiểm tra tự động khi đẩy).

## 1. Mục đích

Chốt một quy trình duy nhất: sửa xong thì chạy gì, kiểm tra gì, theo thứ tự nào, đạt mức nào mới được đẩy lên `main` (là web thật). Mục tiêu không phải bày biện quy trình, mà là **không bao giờ đẩy bản hỏng cho người đang học**.

## 2. Nguyên tắc tư duy

1. **Kiểm tra theo lớp, từ rẻ đến đắt:** lỗi cú pháp/kiểu (máy tự bắt) → dựng bản thật → mở web bấm thử đúng chỗ vừa sửa → kiểm tra chéo tài khoản/thiết bị khi task chạm vào phân quyền/dữ liệu. Lớp rẻ bắt được lỗi thì không tốn lớp đắt.
2. **Chỉ kiểm tra sâu phần mình vừa đụng vào**, cộng các phần có dây chuyền logic với nó (ví dụ sửa nộp bài thì kiểm tra cả Sổ lỗi/FSRS/lịch sử vì chúng ăn dữ liệu từ bài nộp). Không test lại toàn bộ web mỗi lần, nhưng không được bỏ qua dây chuyền.
3. **Chưa kiểm tra = chưa xong.** Commit chỉ được coi là hoàn thành khi đã qua các lớp phù hợp; chưa chạy được lớp nào thì ghi rõ "chưa kiểm tra lớp X" trong báo cáo, không nói "chắc là được".

## 3. Quy trình chạy khi sửa code (môi trường Codespaces)

1. Cài thư viện khi bắt đầu phiên hoặc khi `package.json` thay đổi: `bun install`.
2. Chạy thử: `bun run dev` (cổng 3000). Mở trang xem trước, đăng nhập, đi đúng luồng của task đang sửa.
3. Kiểm tra kiểu: `bun run lint` — thực chất là TypeScript (`tsc --noEmit`). Đạt = không báo lỗi.
4. Dựng bản thật: `bun run build` — đạt = dựng xong không lỗi, có thư mục `dist`.
5. (Khi task đụng phần máy chủ `server.ts`/`server/`) chạy bản đã dựng: `bun run start` và mở thử.

Ghi nhận trung thực: hôm nay các lệnh 3–4 **chưa được chạy diễn tập trong lần rà soát này** (môi trường kiểm tra qua GitHub không chạy dựng được). Lần mở Codespaces tiếp theo, chạy đủ 3–4 một lần trên bản đang tốt để xác nhận tài liệu này khớp thực tế, rồi tích vào mục 8.

## 4. Kiểm thử bằng tay theo dây chuyền (lõi của quy trình)

Dùng trực tiếp danh sách A–H ở Task 0.8. Cách chọn phạm vi mỗi lần:

| Task đụng vào | Phải kiểm tra tối thiểu |
|---|---|
| Đăng nhập/phân quyền | 0.8 nhóm A (3 loại tài khoản) |
| Thêm đề/tải file/đáp án | 0.8 nhóm B + D |
| Làm bài/nộp bài | 0.8 nhóm C + D, sau đó F (Sổ lỗi có nhận câu sai không) |
| Rút đề ngẫu nhiên | 0.8 nhóm E (gồm mô phỏng, dung sai ±1%) |
| Sửa đáp án/báo lỗi | 0.8 nhóm G + nguyên tắc điểm cũ không đổi (Task 0.5) |
| Đổi cấu trúc Supabase | Checklist 4 việc ở Task 1.3 mục 5 + toàn bộ nhóm A, D |
| Chỉ tài liệu (docs) | Không cần test web; chỉ soát lỗi chữ, liên kết giữa các task |

## 5. Trình tự một lần đẩy code "đạt chuẩn"

1. Tạo điểm an toàn nếu là sửa lớn (Task 1.2 mục 5).
2. `bun run lint` đạt → `bun run build` đạt.
3. Bấm thử đúng phạm vi theo bảng mục 4.
4. Soát danh sách file sắp đẩy (không `.env`, không file PDF/dữ liệu thật, không `dist`) — nối Task 1.4 mục 7.
5. Commit nhỏ, đúng mẫu tên; đẩy lên `main`.
6. Đợi Render dựng xong (web Render ngủ thì lần mở đầu chậm là bình thường), mở web thật: đăng nhập Owner, đi lại đúng luồng vừa sửa 1 lượt.
7. Nếu web thật hỏng: hoàn tác theo lớp K1 của Task 1.2 trước, điều tra sau. Không sửa chồng lên bản hỏng trên `main`.

## 6. Việc chưa có và hướng bổ sung (không làm ẩu trong task này)

| Thiếu | Ảnh hưởng | Hướng chốt |
|---|---|---|
| Chưa có test tự động (`test` script) | Lỗi logic (chấm điểm, rút đề 0,5%) chỉ phát hiện khi bấm tay | Sau Giai đoạn 1: viết test nhỏ cho các hàm thuần dễ sai — tính điểm từ đáp án, chuẩn hóa `12,5`, công thức xác suất rút đề. Thêm sau khi các hàm này được chốt ở giai đoạn code, không bày khung test rỗng bây giờ |
| Chưa có kiểm tra tự động khi đẩy (CI) | Đẩy bản không dựng được vẫn lên `main` | Cân nhắc thêm bước kiểm tra `lint`+`build` trên GitHub khi repo ổn định; với nhóm 1 người, kỷ luật mục 5 là lớp chính, CI là lớp phụ |
| Chưa diễn tập khôi phục K2 (1.2) | Có sự cố thật mới lúng túng | Diễn tập 1 lần trên Codespaces: lấy lại 1 file tài liệu cũ từ lịch sử Git, xác nhận làm được, ghi ngày diễn tập vào đây |

## 7. Đối chiếu biến môi trường trên Render (kiểm tra còn treo từ 1.4)

Lần mở Render gần nhất, chỉ đối chiếu **tên** biến (không chép giá trị ra ngoài): phải có `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; `GEMINI_API_KEY` chỉ cần nếu còn dùng đường AI cũ. Thiếu tên nào thì bổ sung tại Render, không sửa code để "né" thiếu biến.

## 8. Tiêu chí nghiệm thu Task 1.5

- [x] Quy trình chạy 5 bước trên Codespaces, ghi rõ lệnh và mức đạt.
- [x] Bảng chọn phạm vi kiểm thử theo dây chuyền, trỏ về Task 0.8.
- [x] Trình tự 7 bước cho một lần đẩy "đạt chuẩn", gồm cả cách xử lý khi web thật hỏng.
- [x] Kê khai trung thực phần chưa có (test tự động, CI) và phần chưa diễn tập.
- [ ] (Diễn tập 1 lần trên Codespaces) Chạy `lint` + `build` trên bản đang tốt và ghi ngày vào đây: ___.

**Kết luận Task 1.5:** Quy trình đã chốt; phần diễn tập thực tế ghi rõ là còn nợ và là việc đầu tiên cần làm khi mở Codespaces lần tới. Sang Task 1.6.
