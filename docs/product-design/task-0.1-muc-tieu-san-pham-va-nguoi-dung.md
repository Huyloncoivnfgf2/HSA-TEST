# Task 0.1 — Xác định mục tiêu sản phẩm và người dùng

**Dự án:** Web ôn thi HSA (ĐHQGHN) — HSA-TEST  
**Giai đoạn:** 0 — Thiết kế sản phẩm (Product Design)  
**Trạng thái:** Bản chốt để làm căn cứ cho các task 0.2–0.8 và các giai đoạn sau  
**Phạm vi áp dụng:** Web chạy trên điện thoại và máy tính tại https://hsa-test.onrender.com

---

## 1. Tóm tắt 1 câu

Xây một web ôn thi HSA **kín, cho một nhóm nhỏ được duyệt**, giúp luyện đề đúng định dạng gốc, bấm giờ như thi thật, chấm điểm sau khi nộp và ôn lại lỗi sai một cách có hệ thống — vận hành đơn giản, chi phí gần như 0.

## 2. Bối cảnh và vấn đề cần giải quyết

Người ôn thi HSA hiện gặp các vấn đề thực tế:

1. Đề nằm rải rác dạng PDF, khó luyện theo từng phần, khó bấm giờ và ghi đáp án ngay trên điện thoại.
2. Làm đề trên giấy/PDF gốc thì không tự chấm nhanh được, khó biết mình yếu ở đâu.
3. Làm xong thường bỏ qua, không ôn lại lỗi sai nên dễ sai lại.
4. Nếu chia sẻ đề tràn lan cho người lạ thì mất kiểm soát và lộ đáp án.

Sản phẩm này ra đời để giải quyết đúng 4 việc trên cho chủ sở hữu và nhóm bạn học chung, **không** nhằm làm nền tảng học trực tuyến đại trà.

## 3. Mục tiêu sản phẩm

### G1. Luyện đề đúng định dạng HSA, như thi thật
- Đề được giữ **nguyên bản dạng PDF**, không cắt/chế lại nội dung.
- 3 phần thi cố định:
  - Định lượng: 50 câu, 75 phút
  - Định tính: 50 câu, 60 phút
  - Khoa học: 50 câu, 60 phút (người học chọn tối đa 3 trong Lí/Hóa/Sinh/Sử/Địa ở các task sau)
- Mỗi câu đúng = 1 điểm. Làm bài được trên cả điện thoại và máy tính.

### G2. Chấm và học từ lỗi sai ngay sau khi nộp
- Chỉ hiện đáp án đúng **sau khi nộp bài** (không lộ trước).
- Sau khi nộp: biết điểm từng phần, câu nào xanh (đúng) / đỏ (sai), xem lại lỗi trong Sổ lỗi.
- Có lịch sử làm bài và phân tích điểm yếu để biết cần ôn phần nào.

### G3. Ôn tập thông minh, tránh học lại nhàm chán
- Ôn tập theo FSRS (mục tiêu nhớ ~90%).
- Khi rút đề ngẫu nhiên để kiểm tra: đề vừa làm gần đây có xác suất được rút lại **rất thấp (0,5% trong 7 ngày đầu)**, tăng dần theo thời gian, để ưu tiên đề chưa làm/đã lâu chưa làm. *(Quy tắc chi tiết sẽ chốt ở task rút đề, 0.1 chỉ ghi mục tiêu.)*

### G4. Dùng chung an toàn cho nhóm nhỏ
- Chỉ người được duyệt mới vào xem và làm đề được.
- Đáp án đúng được bảo vệ phía máy chủ, không xem trộm được từ giao diện trước khi nộp.
- Người quản trị kiểm soát được: ai được vào, đề nào được dùng.

### G5. Vận hành nhẹ, rẻ, dễ sửa
- Dùng hạ tầng miễn phí (Render + Supabase + GitHub), chấp nhận giới hạn của gói free.
- Giao diện đơn giản, ít thao tác, ưu tiên dùng tốt trên điện thoại.
- Dữ liệu học tập được đồng bộ, hạn chế mất bài khi đổi thiết bị.

## 4. Những việc sản phẩm KHÔNG làm (ngoài phạm vi)

Để giữ sản phẩm chắc và không phá phần đã chạy tốt, các mục sau **không thuộc mục tiêu** của giai đoạn này:

- Không mở công khai cho người lạ tự đăng ký; không bán khóa học, không thanh toán.
- Không dùng AI để tự tách câu hỏi từ PDF (đã thử và loại bỏ vì hay lỗi).
- Không làm ứng dụng điện thoại riêng (native app); chỉ làm web dùng trên trình duyệt.
- Không làm bảng xếp hạng công khai, mạng xã hội hay bình luận công khai.
- Không chỉnh sửa nội dung đề trong PDF gốc.

## 5. Người dùng mục tiêu

### 5.1. Nhóm người dùng chính

| Nhóm | Là ai | Nhu cầu chính |
|---|---|---|
| **Owner (chủ web)** | Chính bạn — người tạo và quản lý web, đồng thời cũng là người ôn thi | Có chỗ luyện đề cho mình; quản lý đề và danh sách bạn được vào; xem được mọi thứ cần thiết để vận hành |
| **Learner (bạn học được duyệt)** | Nhóm bạn nhỏ được bạn cho phép vào bằng email | Vào làm đề, bấm giờ, nộp bài, xem điểm và ôn lại lỗi sai của chính mình |
| **Người chưa được duyệt** | Người có link nhưng chưa được cho phép | **Không phải người dùng mục tiêu.** Hệ thống phải chặn, không cho xem đề và đáp án |

> Chi tiết quyền của Owner và Learner sẽ chốt riêng ở **Task 0.2**, 0.1 chỉ xác định họ là ai và cần gì.

### 5.2. Chân dung người dùng điển hình

**Người dùng A — Owner kiêm người học:** Ôn thi HSA nghiêm túc, có nhiều file PDF đề, muốn tự luyện có bấm giờ và rủ một nhóm bạn học cùng. Không rành code, cần mọi thứ bấm là chạy, ít bước.

**Người dùng B — Learner:** Học sinh ôn HSA, chủ yếu dùng điện thoại, thời gian học ngắn theo từng buổi. Cần vào nhanh, chọn đúng phần, làm bài không bị rối, nộp xong biết ngay sai ở đâu để ôn lại.

### 5.3. Đặc điểm chung cần thiết kế đúng
- Dùng tiếng Việt là chính.
- Dùng điện thoại nhiều, màn hình nhỏ, thao tác chạm.
- Cần nhìn rõ đề PDF, có chỗ nháp/vẽ tay ngay khi làm bài.
- Dễ bỏ cuộc nếu thao tác rườm rà — mỗi buổi học phải vào làm được trong vài chạm.

## 6. Việc người dùng cần làm được (kết quả, không phải tính năng)

1. Vào web, đăng nhập, chọn đúng 1 phần thi và bắt đầu làm có bấm giờ.
2. Vừa xem PDF vừa điền đáp án, có nháp riêng cho từng câu.
3. Nộp bài và biết ngay: điểm, câu đúng/sai, cần ôn lại câu nào.
4. Quay lại ôn lỗi sai và đề cũ theo lịch ôn thông minh, không bị rút lại mãi một đề vừa làm.
5. (Owner) Thêm đề mới và cho phép đúng người bạn muốn vào học cùng.

## 7. Nguyên tắc sản phẩm (để các task sau không đi lệch)

1. **Giữ nguyên đề gốc:** PDF là nguồn sự thật, không chế lại nội dung đề.
2. **Không lộ đáp án trước khi nộp** — bằng mọi cách.
3. **Ít bước, rõ ràng:** Người không rành kỹ thuật cũng dùng được.
4. **Không phá cái đang chạy tốt:** Mọi thay đổi sau này chỉ sửa đúng phần liên quan, kiểm tra lại trước khi coi là xong.
5. **Ưu tiên điện thoại trước,** máy tính vẫn phải dùng thoải mái.

## 8. Tiêu chí đánh giá thành công của sản phẩm

Sản phẩm coi là đạt mục tiêu khi:

- Owner và bạn được duyệt làm trọn 1 phần thi (50 câu) từ đầu đến nộp mà không cần hỗ trợ.
- Điểm chấm khớp với đáp án gốc; đáp án không xem được trước khi nộp.
- Người chưa được duyệt bị chặn, không xem được đề.
- Sau khi nộp, người học tìm lại được lỗi sai của mình để ôn.
- Web dùng được ổn định trong giới hạn gói miễn phí cho nhóm nhỏ.

## 9. Ràng buộc và giả định đã biết

- Hạ tầng miễn phí có giới hạn: web có thể ngủ khi lâu không dùng, dung lượng lưu file/ dữ liệu có hạn, cần dùng tiết kiệm.
- Đăng nhập bằng Google; chỉ email được duyệt mới vào được.
- Quy trình sửa code qua GitHub: mọi thay đổi phải kiểm tra rồi mới đưa lên web chính.

## 10. Liên kết sang các task tiếp theo

- **0.2** sẽ chốt chi tiết vai trò Owner / Learner (ai được làm gì).
- **0.3** sẽ chốt luồng luyện tập và thi thử từng bước.
- **0.4** sẽ chốt mô hình đề thi, câu hỏi, đáp án và lời giải.
- Các mục 0.5–0.8 sẽ chốt tiếp về phiên bản/lịch sử sửa, báo lỗi nội dung, điểm số/tiến độ và tiêu chí nghiệm thu.

0.1 này là căn cứ: nếu các task sau mâu thuẫn với mục tiêu ở đây thì phải quay lại sửa 0.1 trước.

## 11. Checklist nghiệm thu riêng cho Task 0.1

- [x] Nói rõ sản phẩm làm để làm gì trong 1 câu.
- [x] Liệt kê 5 mục tiêu (G1–G5) đo được/kiểm tra được.
- [x] Nói rõ sản phẩm **không** làm gì để tránh phình phạm vi.
- [x] Xác định rõ 3 nhóm: Owner, Learner, người chưa được duyệt.
- [x] Mô tả nhu cầu và đặc điểm người dùng (điện thoại, tiếng Việt, ít thao tác).
- [x] Ghi nguyên tắc, ràng buộc và tiêu chí thành công để các task sau bám vào.

**Kết luận Task 0.1: Hoàn thành.** Chờ Owner duyệt trước khi sang Task 0.2.
