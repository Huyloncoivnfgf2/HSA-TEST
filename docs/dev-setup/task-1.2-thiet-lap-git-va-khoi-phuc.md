# Task 1.2 — Thiết lập Git và cơ chế khôi phục

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 1 — Thiết lập môi trường phát triển  
**Liên quan:** Task 1.1 (chốt chuẩn Bun, rủi ro R2/R3) | **Cách làm:** chỉ dựa trên trạng thái Git đã kiểm tra trực tiếp ngày 2026-10-09.

---

## 1. Mục đích

Khi sửa hỏng một chỗ, phải quay lại được bản đang tốt **trong vài phút**, không hoảng, không sửa chồng lên lỗi. Task này chốt: code được lưu thế nào, mỗi lần sửa đi theo quy trình nào, và hỏng thì khôi phục bằng cách nào.

## 2. Hiện trạng Git (đã kiểm tra trực tiếp)

| Hạng mục | Thực tế trong repo | Đánh giá |
|---|---|---|
| Nhánh | Chỉ có **1 nhánh `main`**, chưa được bảo vệ (protected: false) | Đẩy lên `main` là web thật đổi theo → tiện nhưng rủi ro cao nếu đẩy nhầm |
| Lịch sử | Có lịch sử đầy đủ từ 2026-10-07, gồm cả commit gộp (merge) | Khôi phục theo từng commit là khả thi |
| Kiểm tra tự động khi đẩy | Chưa có thư mục `.github` (chưa có quy trình tự chạy kiểm tra) | Đẩy code hỏng là lên thẳng web; xử lý ở Task 1.5 |
| File bỏ qua (`.gitignore`) | Đã bỏ qua: `node_modules/`, `dist/`, file `.env*` (trừ `.env.example`), log | Đúng hướng: bí mật và bản dựng không lên repo |
| File khóa thư viện | Có cả `bun.lock` lẫn `package-lock.json` | Đã chốt chuẩn Bun ở 1.1; cách xử lý file còn lại ở mục 6 |

## 3. Nguyên tắc tư duy (vì sao làm thế này)

1. **Git chỉ cứu được code.** Đề PDF, đáp án, bài nộp nằm ở Supabase — Git không chứa chúng. Khôi phục phải gồm nhiều lớp (mục 7), không ai được nói "có Git là đủ".
2. **`main` là web thật.** Mọi commit lên `main` đều có thể được Render dựng thành web cho người dùng. Vì vậy commit phải nhỏ, có kiểm tra trước, và có điểm an toàn trước khi sửa lớn.
3. **Ưu tiên hoàn tác bằng commit mới** (tạo thêm 1 commit sửa ngược) thay vì viết lại lịch sử. Lịch sử còn nguyên thì lúc nào cũng lần lại được ai đã sửa gì.

## 4. Quy trình làm việc chuẩn (áp từ nay)

**Trước khi sửa một task:**
1. Đảm bảo bản đang tốt đã nằm trên GitHub (không để code tốt chỉ nằm trong Codespaces chưa đẩy — Codespaces mất là mất code chưa đẩy).
2. Nếu task sắp sửa là sửa lớn (đụng nhiều file, đổi cấu trúc dữ liệu): tạo **điểm an toàn** trước (mục 5).
3. Đọc file sắp sửa, chỉ sửa đúng phần liên quan (nguyên tắc từ Giai đoạn 0).

**Khi lưu và đẩy:**
4. Lưu thành **commit nhỏ**, một commit chỉ làm một việc. Tên commit theo mẫu đã dùng trong repo:
   - `docs: ...` tài liệu, `feat: ...` tính năng mới, `fix: ...` sửa lỗi, `chore: ...` dọn dẹp/cấu hình.
   - Ví dụ thật trong lịch sử: `docs: hoàn thành Task 1.1...`, `fix` các commit sửa timeout.
5. Trước khi đẩy, tự soát 4 điều: không có file bí mật (`.env`), không có file PDF đề/dữ liệu thật, không có thư mục `dist`, nội dung commit đúng task đang làm.
6. Đẩy bằng quy trình quen thuộc của bạn:
   `git add -A && git commit -m "..." && git push`
   - Nếu báo `rejected (fetch first)`: `git pull --no-rebase --strategy-option=ours && git push`. **Cảnh báo logic:** cách này ưu tiên bản của máy bạn và có thể lặng lẽ bỏ thay đổi mới trên GitHub — chỉ dùng khi chắc chắn bản máy bạn là bản đúng nhất; nếu không chắc, dừng lại và hỏi trước khi kéo.
   - Nếu mở trình soạn thảo commit thì bấm nút Commit xanh để hoàn tất.

**Sau khi đẩy:**
7. Kiểm tra lại trên GitHub: commit mới nhất đúng tên, đúng file. Đợi Render dựng xong rồi mở web kiểm tra nhanh chỗ vừa sửa (quy trình kiểm tra chi tiết ở Task 1.5).

## 5. Điểm an toàn trước khi sửa lớn

- Tạo một nhánh dự phòng từ `main` tại thời điểm đang tốt, đặt tên: `backup/<ngày>-truoc-<task>`, ví dụ `backup/2026-10-09-truoc-1-3`.
- Nhánh dự phòng **không sửa gì trên đó**, chỉ để đó làm mốc.
- Sửa xong và web chạy tốt: có thể xóa nhánh dự phòng hoặc giữ lại 2–3 mốc gần nhất.
- Với thay đổi chỉ là tài liệu (như các task Giai đoạn 0, 1.1 này): không cần điểm an toàn vì không đụng code chạy.

## 6. Quyết định về hai file khóa thư viện

Tiếp nối Task 1.1 (chuẩn Bun):

- **Chưa xóa `package-lock.json` ngay.** Lý do chậm mà chắc: chưa xác minh môi trường Codespaces/Copilot Agent của bạn có luôn dùng Bun hay đôi khi dùng npm. Xóa vội có thể làm lần cài đặt sau lệch thư viện.
- Điều kiện để xóa sau này (cần đủ cả hai): (1) xác nhận Render và Codespaces đều cài bằng Bun và dựng thành công; (2) dựng thử `bun run build` đạt sau khi xóa. Việc này giao cho Task 1.5 kiểm chứng, không làm trong 1.2.
- Từ nay, khi thư viện thay đổi, file khóa được cập nhật phải là `bun.lock`.

## 7. Cơ chế khôi phục nhiều lớp (xếp từ nhẹ đến nặng)

| Lớp | Khi nào dùng | Cách làm | Hệ quả |
|---|---|---|---|
| **K1. Hoàn tác 1 commit** | Vừa đẩy một commit làm hỏng web | Tạo commit đảo ngược commit đó (chức năng Revert của GitHub hoặc lệnh `git revert <mã-commit>` rồi đẩy) | Web trở lại như trước, lịch sử còn nguyên. **Cách ưu tiên số 1** |
| **K2. Lấy lại 1 file từ lịch sử** | Chỉ hỏng 1–2 file | Mở file trên GitHub → xem lịch sử → mở bản tốt → chép nội dung bản tốt đè lại (cách "Copy raw file" bạn vẫn dùng vì Codespaces khó copy) | Chỉ file đó quay lại, các file khác giữ nguyên |
| **K3. Quay về điểm an toàn** | Sửa lớn làm hỏng nhiều chỗ, không rõ hỏng từ đâu | Lấy code từ nhánh `backup/...` đã tạo ở mục 5 để đối chiếu/khôi phục từng phần | Cần cẩn thận, làm từng file, không chép cả cục mù quáng |
| **K4. Bản sao toàn repo ngoài GitHub** | Mất quyền vào repo/sự cố lớn | Bạn đã có file backup; từ nay mỗi bản backup ghi kèm **ngày + mã commit mới nhất** để biết nó tương ứng bản nào | Chỉ cứu được đến thời điểm backup, nên backup sau mỗi giai đoạn xong |
| **K5. Dữ liệu Supabase** | Hỏng dữ liệu/đáp án/bài nộp | Git **không** cứu được phần này. Dựa vào `supabase/schema.sql` trong repo (cứu cấu trúc) + xuất dữ liệu định kỳ | Chi tiết và lịch xuất dữ liệu chốt ở Task 1.3 |

**Điều cấm để tránh tự làm khó mình:**
- Không dùng lệnh ghi lại lịch sử (`reset --hard`, đẩy ép force-push) trên `main` trừ khi đã tạo điểm an toàn và hiểu rõ hệ quả — với quy mô nhóm này, K1 luôn đủ và an toàn hơn.
- Không xóa nhánh `backup` khi web chưa được kiểm tra chạy tốt.
- Không lưu file bí mật (`.env`, khóa dịch vụ) vào repo dù là để "dự phòng".

## 8. Về việc bảo vệ nhánh `main`

`main` hiện chưa được bảo vệ. Cân nhắc logic cho nhóm nhỏ (1 Owner + Agent + trợ lý):

- Bật bảo vệ kiểu bắt buộc duyệt (pull request) sẽ chặn cách đẩy thẳng hiện tại của bạn và làm mọi thứ chậm lại, trong khi rủi ro chính là đẩy nhầm chứ không phải người lạ sửa (repo kín, chỉ bạn có quyền).
- **Quyết định 1.2: chưa bật bảo vệ nhánh.** Thay vào đó dùng kỷ luật ở mục 4–5 (commit nhỏ, điểm an toàn, hoàn tác K1). Nếu sau này thêm người sửa code, phải xét lại quyết định này.

## 9. Tiêu chí nghiệm thu Task 1.2

- [x] Hiện trạng Git kiểm tra từ repo thật (1 nhánh `main`, chưa bảo vệ, chưa có kiểm tra tự động).
- [x] Quy trình trước–trong–sau khi đẩy, gồm cảnh báo về lệnh kéo ưu tiên bản máy.
- [x] Cơ chế điểm an toàn `backup/<ngày>-truoc-<task>` cho sửa lớn.
- [x] 5 lớp khôi phục K1–K5, tách rõ phần Git cứu được và phần Supabase Git không cứu được.
- [x] Quyết định có lý do về file khóa thứ hai và về chưa bảo vệ `main`.
- [ ] (Để Task 1.5) Diễn tập thử 1 lần khôi phục K2 (lấy lại 1 file từ lịch sử) để chắc chắn làm được khi có sự cố thật.

**Kết luận Task 1.2:** Git và khôi phục đã chốt có bằng chứng và có thứ tự ưu tiên rõ ràng. Chưa sang Task 1.3 cho đến khi phần này được đẩy lên repo và kiểm tra lại.
