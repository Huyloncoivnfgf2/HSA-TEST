# Task 1.4 — Thiết lập biến môi trường và bảo vệ secrets

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 1 — Thiết lập môi trường phát triển  
**Liên quan:** Task 1.1 (điều kiện chạy), Task 1.3 (Supabase), Giai đoạn 0 (không đưa khóa toàn quyền vào web)  
**Bằng chứng đã kiểm tra trực tiếp ngày 2026-10-09:** `.env.example`, `.gitignore`, `src/services/supabaseClient.ts`, `src/components/AuthGate.tsx`, `server.ts`, `server/geminiHandler.ts`, `vite.config.ts`, và sự tồn tại của `firebase-applet-config.json`.  
**Việc đã làm trong task này:** bổ sung file mẫu `.env.example` (chỉ là mẫu rỗng, không chứa giá trị thật, không ảnh hưởng web đang chạy).

---

## 1. Mục đích

Phân biệt rõ biến nào là **cấu hình công khai theo thiết kế**, biến nào là **bí mật thật sự không được lộ**, chúng đang sống ở đâu, và lộ thì xử lý thế nào. Lỗi hay gặp nhất ở dự án kiểu này là nhầm hai loại với nhau: hoặc sợ quá mức một khóa vốn công khai, hoặc (nguy hiểm hơn) đưa khóa toàn quyền vào chỗ công khai.

## 2. Toàn cảnh biến môi trường của dự án (kê khai từ code)

| Biến | Dùng ở đâu (đã kiểm tra) | Loại | Bắt buộc cho hướng hiện tại? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `supabaseClient.ts` (phía trình duyệt) | Cấu hình công khai | **Có** — thiếu là web dừng ở màn hình báo thiếu cấu hình |
| `VITE_SUPABASE_ANON_KEY` | `supabaseClient.ts` (phía trình duyệt) | Cấu hình công khai, an toàn nhờ RLS | **Có** — như trên |
| `GEMINI_API_KEY` | `server/geminiHandler.ts` (phía máy chủ, đọc bằng `process.env`) | **Bí mật thật** | Không — chỉ các đường AI cũ cần; thư viện PDF không cần |
| `PORT` | `server.ts` | Hạ tầng (Render tự cấp) | Render tự lo; chạy máy thì mặc định 3000 |
| `DISABLE_HMR` | `vite.config.ts` khi sửa code ở AI Studio/Codespaces | Chỉ môi trường sửa code | Không đặt trên Render |

Ngoài biến môi trường, repo đang có file `firebase-applet-config.json` chứa cấu hình Firebase dạng web (di sản từ bản AI Studio). File này **không phải biến môi trường** và không chứa khóa toàn quyền máy chủ, nhưng cũng không thêm bí mật mới vào đó. Giữ/bỏ sẽ quyết ở Task 1.6 sau khi kiểm tra còn tính năng nào dùng Firebase không; Task 1.4 không đụng vào file này.

## 3. Nguyên tắc tư duy phân loại (phần quan trọng nhất)

1. **Mọi biến bắt đầu bằng `VITE_` đều sẽ bị đóng vào code gửi xuống trình duyệt của người dùng.** Ai mở web cũng xem được. Vì vậy: chỉ đặt vào `VITE_` những thứ sinh ra để công khai. Khóa anon của Supabase thuộc loại này — nó an toàn **vì** mọi quyền đều bị RLS và các hàm gác cổng chặn lại (Task 1.3), chứ không phải vì nó bí mật.
2. **Khóa toàn quyền của Supabase (service_role) và `GEMINI_API_KEY` là bí mật thật.** Chúng chỉ được sống ở: biến môi trường trên Render (phía máy chủ) và file `.env` tại máy/Codespaces của bạn. Không bao giờ đặt chúng vào biến `VITE_`, không viết vào code, không đưa lên GitHub.
3. **Không có bí mật nào được lưu trong repo.** Repo chỉ chứa file mẫu `.env.example` với tên biến và ô trống. `.gitignore` hiện đã chặn `.env*` (chừa `.env.example`) — đã kiểm tra, đúng.
4. Khi lỗi xảy ra, hỏi đúng câu: "biến này thuộc loại công khai hay bí mật?" rồi mới xử lý. Đổi nhầm khóa công khai không làm web an toàn hơn; để lộ khóa bí mật thì phải xoay khóa ngay (mục 6).

## 4. Các biến sống ở đâu (chốt nơi lưu duy nhất)

| Nơi | Giữ cái gì |
|---|---|
| **Render → trang quản trị dịch vụ → Environment** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (cho bản web thật), và `GEMINI_API_KEY` nếu còn dùng đường AI cũ. Đây là nguồn sự thật của bản chạy thật — **chưa xác minh được từ repo** (ghi nhận từ Task 1.1), khi web báo thiếu cấu hình thì kiểm tra ở đây đầu tiên |
| **Codespaces/máy của bạn: file `.env`** (không lên GitHub) | Các biến như trên để chạy thử khi sửa code. Tạo từ mẫu `.env.example`, tự điền giá trị của bạn |
| **Trang quản trị Supabase** | Cấu hình đăng nhập Google, danh sách email Owner/được duyệt (theo Task 1.3). Khóa toàn quyền chỉ xem ở đây khi thật cần, không chép vào web |
| **Repo GitHub** | Chỉ `.env.example` (mẫu rỗng). Không giá trị thật dưới mọi hình thức, kể cả trong ảnh chụp hay file ghi chú |

## 5. Việc đã sửa trong Task 1.4: file mẫu `.env.example`

Trước task này, `.env.example` chỉ có `GEMINI_API_KEY` — thiếu đúng 2 biến quan trọng nhất, người dựng lại dự án sẽ không biết cần gì. Đã bổ sung thành mẫu đầy đủ:

```env
# --- Ket noi Supabase (cong khai theo thiet ke, bao ve bang RLS) ---
# Lay tai: Supabase Dashboard > Project Settings > API
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# --- Chi may chu, KHONG dat tien to VITE_, KHONG dua len GitHub ---
# Chi can neu con dung cac duong AI cu (/api/gemini); thu vien PDF khong can
GEMINI_API_KEY=

# --- Ha tang ---
# Render tu cap PORT; chay tai may co the de trong (mac dinh 3000)
PORT=
```

File mẫu **không chứa giá trị thật**, không được web nạp khi chạy, nên việc sửa này không thể làm hỏng web đang chạy. Giá trị thật chỉ điền vào file `.env` ở máy/Codespaces và trên Render.

## 6. Khi nghi ngờ lộ bí mật: làm theo thứ tự

1. **Xoay khóa trước, dọn dẹp sau.** Lịch sử Git không xóa sạch được chỉ bằng sửa file. Với `GEMINI_API_KEY`: tạo khóa mới ở nhà cung cấp, cập nhật trên Render, hủy khóa cũ. Với khóa toàn quyền Supabase: đổi ở trang quản trị Supabase rồi cập nhật nơi dùng phía máy chủ (dự án này hiện không dùng khóa toàn quyền trong web — nếu phát hiện nó nằm trong code gửi xuống trình duyệt thì đây là sự cố mức cao nhất, phải đổi khóa ngay).
2. **Khóa anon bị nhìn thấy không phải sự cố** (nó công khai theo thiết kế). Chỉ đổi khi đổi project Supabase hoặc nghi ngờ RLS bị tắt/sửa sai — và khi đó phải kiểm tra RLS trước, đổi khóa sau.
3. Xóa giá trị khỏi file đã lỡ đưa lên, đẩy commit mới, và ghi lại sự cố (ngày, biến nào, đã xoay chưa) trong ghi chú của bạn.
4. Kiểm tra lại web: đăng nhập, nộp thử 1 bài (theo checklist Task 1.3 mục 5).

## 7. Kỷ luật hằng ngày để không tự lộ

- Trước mỗi lần đẩy code, nhìn danh sách file sắp lên: có `.env`, file chứa khóa, ảnh chụp chứa khóa, file dữ liệu thật hay không thì dừng lại (nối tiếp checklist Task 1.2 mục 4).
- Không dán khóa thật vào khung chat, vào prompt cho Agent, hay vào tài liệu trong repo. Cần đưa cấu hình thì đưa **tên biến**, không đưa giá trị.
- Email Owner dự phòng và danh sách được duyệt giữ ở ghi chú riêng ngoài repo (theo Task 1.3 mục 7).
- Khi chia sẻ ảnh chụp lỗi cho người khác xem giúp, che phần địa chỉ chứa khóa và email cá nhân không cần thiết.

## 8. Tiêu chí nghiệm thu Task 1.4

- [x] Kê khai đủ biến từ code thật, phân loại công khai/bí mật kèm lý do.
- [x] Chốt nơi lưu duy nhất cho từng loại; nêu rõ phần chưa xác minh được từ repo (biến trên Render).
- [x] Sửa `.env.example` thành mẫu đầy đủ, không giá trị thật, an toàn với web đang chạy.
- [x] Quy trình xử lý khi lộ: xoay khóa trước, dọn dẹp sau; phân biệt đúng khóa anon công khai.
- [ ] (Kiểm tra thực tế, làm cùng Task 1.5) Mở trang Environment của Render đối chiếu tên biến (không chép giá trị ra ngoài) và chạy thử web sau khi đối chiếu.

**Kết luận Task 1.4:** Biến môi trường và bí mật đã phân loại rõ, file mẫu đã sửa. Chưa sang Task 1.5 cho đến khi phần này được đẩy lên repo và kiểm tra lại.
