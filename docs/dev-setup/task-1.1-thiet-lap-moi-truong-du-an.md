# Task 1.1 — Thiết lập môi trường dự án

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 1 — Thiết lập môi trường phát triển  
**Cách làm:** Chỉ chốt những gì đã kiểm tra trực tiếp trong repo. Chỗ nào chưa kiểm chứng được từ repo sẽ ghi rõ "chưa xác minh", không đoán.

---

## 1. Mục đích

Bất kỳ ai (bạn, mình, hoặc Copilot Agent) mở dự án lên cũng phải biết: dự án gồm những phần nào, chạy bằng lệnh gì, phần nào đang là chính, phần nào là cũ — để không sửa nhầm chỗ và không làm hỏng web đang chạy.

## 2. Bản đồ môi trường (đã kiểm tra trong repo)

Dự án có 4 mảnh ghép:

| Mảnh | Vai trò | Bằng chứng trong repo |
|---|---|---|
| **Mã nguồn (GitHub, nhánh `main`)** | Nơi chứa toàn bộ code; sửa ở đây | Repo `HSA-TEST` |
| **Môi trường sửa code (GitHub Codespaces)** | Mở code lên sửa bằng Copilot Agent | Quy trình bạn đang dùng |
| **Nơi web chạy thật (Render)** | Mỗi lần đẩy code lên `main`, Render tự dựng lại web tại hsa-test.onrender.com | Chưa có file cấu hình Render trong repo (xem rủi ro R2) |
| **Dữ liệu & đăng nhập (Supabase)** | Lưu đề, đáp án, người dùng, bài nộp; đăng nhập Google | Thư mục `supabase/schema.sql`, file `src/services/supabaseClient.ts` |

Luồng chạy thật: **sửa code → đẩy lên nhánh `main` → Render dựng bản mới → người dùng mở web → web nối vào Supabase.**

## 3. Công nghệ đang dùng (chốt theo `package.json`)

- Giao diện: React 19 + Vite + TypeScript, Tailwind CSS 4 (file vào: `src/main.tsx`, cấu hình `vite.config.ts`, `tsconfig.json`).
- Máy chủ web: Express (`server.ts`) — khi chạy thật, máy chủ này phát giao diện đã dựng ở thư mục `dist` và giữ các đường API cũ `/api/gemini/...`.
- PDF và ôn tập: `pdfjs-dist` (xem PDF), `ts-fsrs` (lịch ôn), KaTeX (công thức).
- Kết nối dữ liệu: `@supabase/supabase-js`.

> Lưu ý tư duy: trong code vẫn còn phần cũ của thời dùng AI tách câu hỏi (Gemini) và Firebase. Đó là **di sản**, không phải hướng hiện tại (hướng hiện tại là thư viện PDF + Supabase theo Giai đoạn 0). Task 1.6 sẽ kê khai giữ/bỏ; Task 1.1 này không xóa gì cả.

## 4. Lệnh chuẩn (lấy nguyên từ `package.json`)

| Việc | Lệnh | Ghi chú |
|---|---|---|
| Cài thư viện | `bun install` | Xem quyết định trình quản lý gói ở mục 5 |
| Chạy thử khi sửa | `bun run dev` | Mở ở cổng 3000 |
| Dựng bản chạy thật | `bun run build` | Ra thư mục `dist` |
| Chạy bản đã dựng | `bun run start` | Chạy `server.ts`, cổng lấy từ biến `PORT`, không có thì 3000 |
| Kiểm tra lỗi kiểu dữ liệu | `bun run lint` | Thực chất là kiểm tra TypeScript (`tsc --noEmit`), không phải bộ kiểm tra đầy đủ — Task 1.5 sẽ bổ sung quy trình kiểm thử |

Hiện **chưa có lệnh kiểm thử tự động** (`test`). Đây là thiếu sót có thật, xử lý ở Task 1.5, không giấu.

## 5. Quyết định: dùng một trình quản lý gói duy nhất

Trong repo đang có **cả hai** file khóa: `bun.lock` và `package-lock.json`. Hai file cùng tồn tại dễ gây lệch phiên bản thư viện giữa máy sửa và Render.

Chốt cho Giai đoạn 1:
- **Chuẩn duy nhất: Bun** (vì Render đang dựng bằng Bun như bạn đã thiết lập).
- Mọi hướng dẫn từ nay viết theo Bun (`bun install`, `bun run ...`).
- **Chưa xóa** `package-lock.json` trong Task 1.1. Việc dọn file khóa và cơ chế khôi phục để Task 1.2 quyết định sau khi đã có phương án dự phòng an toàn.

Tương tự, `package.json` **chưa ghi phiên bản Node/Bun yêu cầu** (không có mục `engines`, không có file `.nvmrc`). Ghi nhận là rủi ro R4; chỉ chốt số phiên bản sau khi xem đúng cấu hình trên Render, không tự bịa số.

## 6. Cấu trúc thư mục cần nhớ

| Thư mục/file | Chứa gì |
|---|---|
| `src/components/` | Các màn hình: thư viện PDF, làm bài, Sổ lỗi, ôn FSRS, quản lý người dùng... |
| `src/services/` | Kết nối Supabase, đồng bộ dữ liệu, FSRS, lưu trữ |
| `src/data/`, `src/hooks/`, `src/types/` | Dữ liệu mẫu, logic dùng chung, định nghĩa kiểu |
| `server/` + `server.ts` | Phần máy chủ cũ (API Gemini) và phát web đã dựng |
| `supabase/schema.sql` | Toàn bộ cấu trúc dữ liệu và phân quyền (Task 1.3 sẽ đi sâu) |
| `docs/` | Tài liệu thiết kế (Giai đoạn 0) và môi trường (Giai đoạn 1 này) |

Đường tắt `@` trong code trỏ về thư mục gốc dự án (khai trong `vite.config.ts` và `tsconfig.json`) — không đổi đường tắt này.

## 7. Điều kiện để web chạy được (mức tối thiểu)

1. Có đủ 2 biến kết nối Supabase cho phần giao diện: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Thiếu 2 biến này, web vẫn mở nhưng phần dữ liệu đám mây tắt (code đã xử lý sẵn trường hợp này trong `supabaseClient.ts`). Chi tiết bảo vệ biến để Task 1.4.
2. Trên Render phải có 2 biến trên ở phần cài đặt của dịch vụ. **Chưa xác minh được từ repo** vì không có file cấu hình Render — cần bạn hoặc mình kiểm tra trên trang quản trị Render ở Task sau, không suy đoán.
3. File mẫu `.env.example` hiện mới chỉ có biến Gemini, **thiếu 2 biến Supabase** ở trên. Đây là lỗi tài liệu có thật, sẽ sửa ở Task 1.4 (không sửa vội trong 1.1 để giữ đúng phạm vi từng task).

## 8. Những rủi ro phát hiện khi kiểm tra sâu (ghi nhận, chưa xử lý)

- **R1. Chưa có file README:** người mới mở repo không có hướng dẫn chạy. → Bổ sung khi chốt xong 1.1–1.5.
- **R2. Chưa có file cấu hình Render trong repo:** cài đặt dựng web đang nằm trên trang quản trị Render; mất/đổi nhầm ở đó là repo không cứu được. → Cân nhắc ở Task 1.2/1.5, không tự thêm file cấu hình khi chưa rõ thông số thật.
- **R3. Hai file khóa gói (Bun + npm) cùng tồn tại:** nguy cơ lệch phiên bản. → Đã chốt chuẩn Bun ở mục 5; dọn ở 1.2.
- **R4. Chưa chốt phiên bản Node/Bun:** máy khác nhau có thể dựng khác kết quả. → Chốt sau khi đọc cấu hình Render thật.
- **R5. Lệnh `clean` trong `package.json`** xóa `server.js` (file không còn dùng ở luồng hiện tại) — lệnh thừa di sản, để 1.6 kê khai, không ảnh hưởng chạy web.
- **R6. Dòng mô tả trong `index.html`** vẫn nói "trích xuất đề bằng AI" — lệch với hướng hiện tại (thư viện PDF). → Kê khai ở 1.6, sửa chữ không khó nhưng không thuộc 1.1.

## 9. Quy tắc không được phá khi đụng vào môi trường

1. Không đổi cổng mặc định 3000 và cách `server.ts` phát thư mục `dist`.
2. Không sửa khối cấu hình có ghi chú "không sửa" trong `vite.config.ts` (phần tắt HMR cho môi trường AI Studio).
3. Không xóa phần cũ (Gemini/Firebase) trong các task môi trường; chỉ kê khai, quyết định giữ/bỏ ở 1.6.
4. Mọi thay đổi môi trường phải chạy được cả 2 lệnh: `bun run build` và `bun run lint` trước khi coi là xong (cách kiểm tra cụ thể ở 1.5).

## 10. Tiêu chí nghiệm thu Task 1.1

- [x] Bản đồ 4 mảnh của môi trường và luồng đẩy code → web chạy thật.
- [x] Bảng công nghệ và bảng lệnh lấy từ chính `package.json`, không bịa.
- [x] Chốt một trình quản lý gói duy nhất (Bun) và nêu rõ chưa xóa file khóa còn lại.
- [x] Nêu rõ điều kiện chạy tối thiểu và chỗ **chưa xác minh được** (cấu hình trên Render).
- [x] Liệt kê rủi ro R1–R6 kèm task sẽ xử lý, không xử lý lan man trong 1.1.
- [ ] (Làm ở bước kiểm tra sau) Chạy thật `bun run build` + `bun run lint` trên Codespaces để xác nhận các lệnh trên đúng như tài liệu.

**Kết luận Task 1.1:** Môi trường đã được mô tả đúng bằng chứng. Chưa sang Task 1.2 cho đến khi phần này được đẩy lên repo và kiểm tra lại.
