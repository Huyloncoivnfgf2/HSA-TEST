# Task 10.2 — Chuẩn hóa layout và breakpoint

**Dự án:** Web ôn thi HSA — HSA-TEST | **Giai đoạn:** 10 — Responsive, mobile và PWA  
**Cơ sở:** Báo cáo khảo sát Task 10.1 (mục D). Task này chỉ sửa layout/hiển thị; không đổi logic nghiệp vụ, không triển khai PWA/offline.

## 1. Các thay đổi

- **Màn hình làm bài PDF** (`src/components/PdfExamPlayer.tsx`): cột phiếu đáp án trên desktop đổi từ tỉ lệ 28% (tối thiểu 310px) + vùng PDF cố định 72% sang cột cố định 330px (380px từ màn hình rất rộng) và vùng PDF co giãn phần còn lại. Cách cũ cộng hai phần có thể vượt khung tại đúng bề rộng 1024px; cách mới không thể tràn vì chỉ một phía cố định. Các nút Lời giải/Nộp bài ở thanh trên được nâng vùng bấm lên tối thiểu 40px.
- **Thanh điều hướng** (`src/components/Header.tsx`): nhóm nút bên phải (chuỗi ngày, FSRS, Sổ lỗi, Lịch sử, Mục tiêu, công cụ Owner, sáng/tối, hồ sơ) nay cuộn ngang trong chính khu vực của nó trên màn hình hẹp thay vì đẩy logo hoặc tràn khỏi mép. Không nút nào bị ẩn hay mất chức năng; nhãn chữ vẫn ẩn/hiện theo breakpoint như cũ.
- **Bảng xét dấu trong nội dung câu hỏi** (`src/index.css`): ở màn hình ≤640px, bảng cuộn ngang trong vùng của nó thay vì tràn ra ngoài thẻ câu hỏi.
- **Bảng phân tích theo chuyên đề** (`src/components/SubjectAnalyticsView.tsx`): bảng có chiều rộng tối thiểu 560px và cuộn ngang trong khung đã có sẵn, thay vì bị bóp nghẹt trên điện thoại.

## 2. Kiểm tra đã chạy

- `bun run test`: **26 đạt, 0 lỗi** (bộ hồi quy Giai đoạn 9 không bị ảnh hưởng — các thay đổi thuần class hiển thị).
- `bun run build`: đạt.
- `bun run lint`: chỉ còn lỗi cũ ở `src/services/geminiClient.ts`, không phát sinh lỗi mới; các file đã sửa đều sạch.

## 3. Phạm vi kiểm tra chiều rộng

- Đã đối chiếu bằng code tại các mốc 360/390/768/1024/1440: container chính `max-w-7xl` + padding theo breakpoint; lưới thẻ điểm/chọn môn đã có sẵn co giãn 1→3 cột; điểm tràn 1024px trong màn hình làm bài đã bị loại theo cấu trúc mới.
- **Chưa kiểm tra trên thiết bị thật hay trình duyệt giả lập** trong task này; các mục sau vẫn cần xác nhận trực tiếp (giữ nguyên từ Task 10.1 mục H): bàn phím ảo che nút trong modal, vẽ annotation bằng ngón tay, hiệu năng render PDF trên điện thoại.

## 4. Xác nhận phạm vi

- Không thay đổi logic đăng nhập/phân quyền/làm bài/tính điểm/lưu đáp án/lịch sử/báo lỗi/thông báo. Không sửa schema/RLS. Không thêm package. Không triển khai PWA/offline (Task 10.6–10.7).
- Các modal lớn của Owner giữ nguyên kích thước tối đa và cơ chế cuộn trong như trước; chỉ xác nhận chúng đã có padding quanh và `max-h` — việc với bàn phím ảo để lại kiểm tra trên thiết bị.
