import { Question } from '../types/hsa';

export const INITIAL_QUESTIONS: Question[] = [
  // ==================== TOÁN HỌC (Tư duy định lượng) ====================
  {
    id: 'math-1',
    subject: 'math',
    subTopic: 'Hàm số & Đạo hàm',
    type: 'multiple-choice',
    questionText: 'Cho hàm số $y = f(x)$ có bảng xét dấu của đạo hàm $f\'(x)$ như sau:\n\nBiết $f\'(x) > 0$ trên $(-\\infty; -1)$ và $(2; +\\infty)$, $f\'(x) < 0$ trên $(-1; 2)$.\n\nHỏi hàm số đã cho đạt cực đại tại điểm nào sau đây?',
    options: [
      '$x = -1$',
      '$x = 2$',
      '$x = 0$',
      '$x = 1$'
    ],
    correctAnswer: 0,
    explanation: 'Đạo hàm $f\'(x)$ đổi dấu từ dương sang âm khi đi qua $x = -1$. Do đó hàm số đạt cực đại tại $x = -1$. Tại $x = 2$, đạo hàm đổi dấu từ âm sang dương nên đó là điểm cực tiểu.'
  },
  {
    id: 'math-2',
    subject: 'math',
    subTopic: 'Nguyên hàm & Tích phân',
    type: 'multiple-choice',
    questionText: 'Tính tích phân sau: $$I = \\int_0^1 (2x + 1) e^x \\, dx$$',
    options: [
      '$I = e + 1$',
      '$I = 2e - 1$',
      '$I = e$',
      '$I = 2e + 1$'
    ],
    correctAnswer: 0,
    explanation: 'Đặt $\\begin{cases} u = 2x + 1 \\\\ dv = e^x dx \\end{cases} \\Rightarrow \\begin{cases} du = 2dx \\\\ v = e^x \\end{cases}$.\nÁp dụng tích phân từng phần: \n$$I = [(2x + 1)e^x]_0^1 - \\int_0^1 2e^x dx = 3e - 1 - 2(e - 1) = e + 1.$$'
  },
  {
    id: 'math-3',
    subject: 'math',
    subTopic: 'Hình học không gian Oxyz',
    type: 'multiple-choice',
    questionText: 'Trong không gian với hệ tọa độ $Oxyz$, cho mặt phẳng $(P): 2x - y + 2z - 6 = 0$ và điểm $M(1; -2; 3)$. Khoảng cách từ điểm $M$ đến mặt phẳng $(P)$ bằng:',
    options: [
      '$d(M, (P)) = \\frac{4}{3}$',
      '$d(M, (P)) = 2$',
      '$d(M, (P)) = \\frac{8}{3}$',
      '$d(M, (P)) = \\frac{14}{3}$'
    ],
    correctAnswer: 0,
    explanation: 'Khoảng cách từ $M(x_0, y_0, z_0)$ đến $(P): Ax + By + Cz + D = 0$ tính theo công thức:\n$$d(M, (P)) = \\frac{|2(1) - (-2) + 2(3) - 6|}{\\sqrt{2^2 + (-1)^2 + 2^2}} = \\frac{|2 + 2 + 6 - 6|}{\\sqrt{9}} = \\frac{4}{3}.$$'
  },
  {
    id: 'math-4',
    subject: 'math',
    subTopic: 'Số phức',
    type: 'multiple-choice',
    questionText: 'Cho số phức $z$ thỏa mãn $(1 + 2i)z = 3 - 4i$. Môđun của số phức $w = z + 2 - i$ bằng:',
    options: [
      '$|w| = \\sqrt{5}$',
      '$|w| = 5$',
      '$|w| = \\sqrt{10}$',
      '$|w| = 3$'
    ],
    correctAnswer: 2,
    explanation: 'Ta có $z = \\frac{3 - 4i}{1 + 2i} = \\frac{(3 - 4i)(1 - 2i)}{1^2 + 2^2} = \\frac{3 - 6i - 4i - 8}{5} = \\frac{-5 - 10i}{5} = -1 - 2i$.\nSuy ra $w = (-1 - 2i) + 2 - i = 1 - 3i$.\nDo đó môđun $|w| = \\sqrt{1^2 + (-3)^2} = \\sqrt{10}$.'
  },
  {
    id: 'math-5',
    subject: 'math',
    subTopic: 'Xác suất & Tổ hợp',
    type: 'multiple-choice',
    questionText: 'Một hộp chứa 5 quả cầu màu đỏ và 4 quả cầu màu xanh có kích thước như nhau. Lấy ngẫu nhiên đồng thời 3 quả cầu. Xác suất để trong 3 quả cầu lấy ra có ít nhất 1 quả màu đỏ là:',
    options: [
      '$\\frac{20}{21}$',
      '$\\frac{1}{21}$',
      '$\\frac{10}{21}$',
      '$\\frac{5}{9}$'
    ],
    correctAnswer: 0,
    explanation: 'Không gian mẫu $n(\\Omega) = C_9^3 = \\frac{9 \\cdot 8 \\cdot 7}{3 \\cdot 2 \\cdot 1} = 84$.\nBiến cố đối $\\overline{A}$: "Không lấy được quả đỏ nào", tức là cả 3 quả đều màu xanh: $n(\\overline{A}) = C_4^3 = 4$.\nDo đó $P(A) = 1 - P(\\overline{A}) = 1 - \\frac{4}{84} = 1 - \\frac{1}{21} = \\frac{20}{21}$.'
  },
  {
    id: 'math-6',
    subject: 'math',
    subTopic: 'Phương trình mũ & Logarit',
    type: 'multiple-choice',
    questionText: 'Tập nghiệm của bất phương trình $\\log_2(x^2 - 3x) \\le 2$ là:',
    options: [
      '$[-1; 0) \\cup (3; 4]$',
      '$[-1; 4]$',
      '$(-\\infty; 0) \\cup (3; +\\infty)$',
      '$(-1; 0) \\cup (3; 4)$'
    ],
    correctAnswer: 0,
    explanation: 'Điều kiện xác định: $x^2 - 3x > 0 \\Leftrightarrow x < 0$ hoặc $x > 3$.\nBất phương trình tương đương: $x^2 - 3x \\le 2^2 = 4 \\Leftrightarrow x^2 - 3x - 4 \\le 0 \\Leftrightarrow -1 \\le x \\le 4$.\nKết hợp điều kiện xác định: $x \\in [-1; 0) \\cup (3; 4]$.'
  },
  {
    id: 'math-7',
    subject: 'math',
    subTopic: 'Tư duy logic & Ứng dụng thực tế',
    type: 'multiple-choice',
    questionText: 'Một người gửi tiết kiệm 100 triệu đồng vào ngân hàng với lãi suất $6\\%/\\text{năm}$, tiền lãi hàng năm được nhập vào vốn (lãi kép). Giả sử lãi suất không đổi, sau ít nhất bao nhiêu năm người đó nhận được số tiền lớn hơn 150 triệu đồng?',
    options: [
      '7 năm',
      '8 năm',
      '6 năm',
      '9 năm'
    ],
    correctAnswer: 0,
    explanation: 'Áp dụng công thức lãi kép $S_n = P(1 + r)^n$.\nTa cần: $100(1 + 0{,}06)^n > 150 \\Leftrightarrow 1{,}06^n > 1{,}5 \\Leftrightarrow n > \\log_{1{,}06}(1{,}5) \\approx 6{,}958$.\nVì số năm $n$ là số nguyên nên sau ít nhất 7 năm số tiền sẽ vượt 150 triệu đồng.'
  },

  // ==================== NGỮ VĂN (Tư duy định tính) ====================
  {
    id: 'lit-group-1',
    originalNumber: 1,
    subject: 'literature',
    subTopic: 'Đọc hiểu văn bản văn học',
    difficulty: 'trung bình',
    groupId: 'group-tay-tien',
    groupTitle: 'Đọc đoạn thơ sau và trả lời các câu hỏi 1 và 2:',
    groupContent: '"Sông Mã xa rồi Tây Tiến ơi!\nNhớ về rừng núi, nhớ chơi vơi.\nSài Khao sương lấp đoàn quân mỏi,\nMường Lát hoa về trong đêm hơi.\n\nDốc lên khúc khuỷu dốc thăm thẳm,\nHeo hút cồn mây, súng ngửi trời.\nNgàn thước lên cao, ngàn thước xuống,\nNhà ai Pha Luông mưa xa khơi."\n\n(Quang Dũng – Tây Tiến)',
    type: 'multiple-choice',
    questionText: 'Từ láy "chơi vơi" trong câu thơ "Nhớ về rừng núi, nhớ chơi vơi" diễn tả trạng thái cảm xúc gì của người lính Tây Tiến?',
    options: [
      'Nỗi nhớ tha thiết, mênh mang, lơ lửng không hình khối gắn liền với không gian núi rừng hiểm trở.',
      'Sự hụt hẫng, sợ hãi trước những hiểm nguy của thiên nhiên miền Tây Bắc.',
      'Sự băn khoăn, mất phương hướng trên con đường hành quân gian khổ.',
      'Cảm giác cô đơn tuyệt vọng giữa rừng sâu hoang vu.'
    ],
    correctAnswer: 0,
    explanation: '"Chơi vơi" là từ láy tượng hình gợi không gian lơ lửng, đồng thời gợi tả nỗi nhớ da diết, mênh mông, lan tỏa khắp núi rừng Tây Bắc, xuất phát từ đáy lòng đầy hào hoa của người lính.'
  },
  {
    id: 'lit-group-2',
    originalNumber: 2,
    subject: 'literature',
    subTopic: 'Biện pháp tu từ & Phong cách',
    difficulty: 'dễ',
    groupId: 'group-tay-tien',
    groupTitle: 'Đọc đoạn thơ sau và trả lời các câu hỏi 1 và 2:',
    groupContent: '"Sông Mã xa rồi Tây Tiến ơi!\nNhớ về rừng núi, nhớ chơi vơi.\nSài Khao sương lấp đoàn quân mỏi,\nMường Lát hoa về trong đêm hơi.\n\nDốc lên khúc khuỷu dốc thăm thẳm,\nHeo hút cồn mây, súng ngửi trời.\nNgàn thước lên cao, ngàn thước xuống,\nNhà ai Pha Luông mưa xa khơi."\n\n(Quang Dũng – Tây Tiến)',
    type: 'multiple-choice',
    questionText: 'Hình ảnh nhân hóa "súng ngửi trời" trong đoạn trích trên mang ý nghĩa nghệ thuật gì?',
    options: [
      'Khắc họa độ cao chót vót của dốc núi mà người lính hành quân qua, đồng thời thể hiện nét hóm hỉnh, lạc quan của người lính trẻ.',
      'Miêu tả họng súng đang bốc khói sau trận giao tranh ác liệt.',
      'Nhấn mạnh vào vũ khí hiện đại mà quân đội ta được trang bị thời bấy giờ.',
      'Biểu đạt sự ngột ngạt, khó thở của khí hậu vùng núi cao.'
    ],
    correctAnswer: 0,
    explanation: 'Hình ảnh "súng ngửi trời" là một sáng tạo độc đáo của Quang Dũng. Người lính đeo súng trên vai, khi trèo lên đỉnh dốc mù mây thì mũi súng chạm vào trời xanh, vừa đặc tả độ cao thăm thẳm của thiên nhiên vừa làm toát lên nét trẻ trung, dí dỏm, tinh nghịch của những chàng trai Hà thành hào hoa.'
  },
  {
    id: 'lit-2',
    subject: 'literature',
    subTopic: 'Đọc hiểu tác phẩm',
    type: 'multiple-choice',
    questionText: 'Trong truyện ngắn "Vợ chồng A Phủ" của Tô Hoài, hình ảnh tiếng sáo trong đêm tình mùa xuân có vai trò gì quan trọng nhất đối với nhân vật Mị?',
    options: [
      'Là chất xúc tác đánh thức sức sống tiềm tàng, ý thức về tuổi trẻ và khát vọng tự do của Mị.',
      'Nhắc nhở Mị về món nợ truyền kiếp của gia đình với nhà thống lí Pá Tra.',
      'Giúp Mị nhận ra sự tàn độc của A Sử khi không cho mình đi chơi Tết.',
      'Làm cho Mị quyết định cứu A Phủ ngay trong đêm mùa xuân ấy.'
    ],
    correctAnswer: 0,
    explanation: 'Tiếng sáo gọi bạn tình là biểu tượng của tình yêu, tuổi trẻ và sự tự do ở Tây Bắc. Nó đã len lỏi vào tâm hồn đang nguội lạnh của Mị, đánh thức ký ức và khát khao sống của cô sau bao năm câm lặng như con rùa lùi lũi nơi xó cửa.'
  },
  {
    id: 'lit-3',
    subject: 'literature',
    subTopic: 'Phong cách ngôn ngữ & Ngữ pháp',
    type: 'multiple-choice',
    questionText: 'Xác định lỗi sai trong câu sau: "Qua tác phẩm Lão Hạc của Nam Cao cho ta thấy số phận bi thảm của người nông dân Việt Nam trước Cách mạng tháng Tám."',
    options: [
      'Câu thiếu chủ ngữ do nhầm lẫn giữa trạng ngữ và chủ ngữ.',
      'Câu thiếu vị ngữ do dùng từ quan hệ chưa chính xác.',
      'Câu sai phong cách ngôn ngữ diễn đạt.',
      'Câu sai logic ngữ nghĩa giữa các vế.'
    ],
    correctAnswer: 0,
    explanation: 'Cụm "Qua tác phẩm Lão Hạc của Nam Cao" là trạng từ/trạng ngữ mở đầu câu. Tiếp theo là "cho ta thấy..." khiến câu không có thành phần chủ ngữ chính. Cách sửa đúng: bỏ từ "Qua", hoặc sửa thành: "Qua tác phẩm Lão Hạc của Nam Cao, tác giả đã cho ta thấy..."'
  },
  {
    id: 'lit-4',
    subject: 'literature',
    subTopic: 'Đọc hiểu văn bản thông tin',
    type: 'multiple-choice',
    questionText: 'Đọc đoạn văn sau: "Trí tuệ nhân tạo (AI) đang định hình lại nền kinh tế toàn cầu, không chỉ tự động hóa các công việc lặp đi lặp lại mà còn tham gia vào quá trình sáng tạo nội dung và ra quyết định phức tạp."\n\nNội dung chính của đoạn văn trên là gì?',
    options: [
      'Khẳng định tầm ảnh hưởng sâu rộng và đa chiều của AI đối với nền kinh tế.',
      'Cảnh báo nguy cơ người lao động bị mất việc làm do công nghệ AI.',
      'Phân tích chi tiết quy trình xử lý công việc sáng tạo của trí tuệ nhân tạo.',
      'So sánh năng lực tư duy của con người với hệ thống máy tính tự động.'
    ],
    correctAnswer: 0,
    explanation: 'Đoạn trích nêu bật vai trò kép của AI: vừa tự động hóa tác vụ cơ bản vừa tham gia sáng tạo và ra quyết định phức tạp, chứng minh sức ảnh hưởng toàn diện đến nền kinh tế.'
  },
  {
    id: 'lit-5',
    subject: 'literature',
    subTopic: 'Kiến thức Văn học',
    type: 'multiple-choice',
    questionText: 'Hình tượng "Đất Nước" trong trường ca "Mặt đường khát vọng" của Nguyễn Khoa Điềm được khám phá trên những bình diện nào?',
    options: [
      'Địa lý, Lịch sử và Văn hóa gắn liền với tư tưởng Đất Nước của Nhân Dân.',
      'Kinh tế, Quân sự và Ngoại giao qua các thời kỳ đánh giặc.',
      'Chỉ riêng về vẻ đẹp thiên nhiên kỳ vĩ của núi sông đất nước.',
      'Lịch sử đấu tranh của giai cấp công nhân và nông dân Việt Nam.'
    ],
    correctAnswer: 0,
    explanation: 'Nguyễn Khoa Điềm tiếp cận Đất Nước trên 3 phương diện: Địa lý (không gian), Lịch sử (thời gian) và Văn hóa - Phong tục dân gian, hội tụ sâu sắc trong tư tưởng cốt lõi: "Đất Nước này là Đất Nước của Nhân Dân".'
  },

  // ==================== KHOA HỌC (Tự nhiên & Xã hội) ====================
  {
    id: 'sci-1',
    subject: 'science',
    subTopic: 'Vật lý - Dao động & Sóng cơ',
    type: 'multiple-choice',
    questionText: 'Một con lắc lò xo gồm vật nhỏ khối lượng $m = 100\\text{ g}$ và lò xo có độ cứng $k = 40\\text{ N/m}$. Lấy $\\pi^2 = 10$. Chu kì dao động riêng của con lắc bằng:',
    options: [
      '$T = 0{,}314\\text{ s}$',
      '$T = 0{,}628\\text{ s}$',
      '$T = 1{,}0\\text{ s}$',
      '$T = 2{,}0\\text{ s}$'
    ],
    correctAnswer: 0,
    explanation: 'Khối lượng đổi ra chuẩn: $m = 0{,}1\\text{ kg}$.\nChu kì dao động của con lắc lò xo:\n$$T = 2\\pi \\sqrt{\\frac{m}{k}} = 2\\pi \\sqrt{\\frac{0{,}1}{40}} = 2\\pi \\sqrt{\\frac{1}{400}} = \\frac{2\\pi}{20} = \\frac{\\pi}{10} \\approx \\frac{3{,}14}{10} = 0{,}314\\text{ s}.$$'
  },
  {
    id: 'sci-2',
    subject: 'science',
    subTopic: 'Hóa học - Hóa học hữu cơ',
    type: 'multiple-choice',
    questionText: 'Đun nóng este $CH_3COOC_2H_5$ (etyl axetat) với một lượng vừa đủ dung dịch $NaOH$, đun nóng. Sản phẩm hữu cơ thu được sau phản ứng gồm:',
    options: [
      '$CH_3COONa$ và $C_2H_5OH$',
      '$C_2H_5COONa$ và $CH_3OH$',
      '$CH_3COOH$ và $C_2H_5ONa$',
      '$HCOONa$ và $C_3H_7OH$'
    ],
    correctAnswer: 0,
    explanation: 'Phản ứng xà phòng hóa este trong môi trường kiềm:\n$$CH_3COOC_2H_5 + NaOH \\xrightarrow{t^\\circ} CH_3COONa + C_2H_5OH$$\nSản phẩm là natri axetat và rượu etylic (ancol etylic).'
  },
  {
    id: 'sci-3',
    subject: 'science',
    subTopic: 'Sinh học - Di truyền học',
    type: 'multiple-choice',
    questionText: 'Ở một loài thực vật lưỡng bội, gen A quy định thân cao trội hoàn toàn so với alen a quy định thân thấp. Phép lai giữa hai cây có kiểu gen $Aa \\times Aa$ cho đời con $F_1$ có tỉ lệ kiểu hình là:',
    options: [
      '3 cây thân cao : 1 cây thân thấp',
      '1 cây thân cao : 1 cây thân thấp',
      '100% cây thân cao',
      '1 cây thân cao : 2 cây thân trung bình : 1 cây thân thấp'
    ],
    correctAnswer: 0,
    explanation: 'Sơ đồ lai: $P: Aa \\times Aa \\Rightarrow F_1: 1AA : 2Aa : 1aa$.\nVì gen A trội hoàn toàn so với a nên các kiểu gen $AA$ và $Aa$ đều cho kiểu hình thân cao (tổng $3/4$), còn kiểu gen $aa$ cho thân thấp ($1/4$). Tỉ lệ kiểu hình là $3:1$.'
  },
  {
    id: 'sci-4',
    subject: 'science',
    subTopic: 'Lịch sử - Lịch sử Việt Nam',
    type: 'multiple-choice',
    questionText: 'Thắng lợi nào của quân dân ta đã buộc thực dân Pháp phải ký Hiệp định Giơ-ne-vơ năm 1954 về chấm dứt chiến tranh, lập lại hòa bình ở Đông Dương?',
    options: [
      'Chiến thắng Điện Biên Phủ (1954)',
      'Chiến dịch Biên giới thu - đông (1950)',
      'Chiến dịch Việt Bắc thu - đông (1947)',
      'Trận đánh tại Cầu Giấy (1873)'
    ],
    correctAnswer: 0,
    explanation: 'Chiến thắng lịch sử Điện Biên Phủ "lừng lẫy năm châu, chấn động địa cầu" ngày 7/5/1954 đã đập tan kế hoạch Nava, giáng đòn quyết định vào ý chí xâm lược của thực dân Pháp, buộc Pháp phải ký kết Hiệp định Giơ-ne-vơ.'
  },
  {
    id: 'sci-5',
    subject: 'science',
    subTopic: 'Địa lý - Địa lý kinh tế & Tự nhiên',
    type: 'multiple-choice',
    questionText: 'Thế mạnh tự nhiên nổi bật nhất để phát triển kinh tế biển ở vùng Duyên hải Nam Trung Bộ nước ta là gì?',
    options: [
      'Bờ biển khúc khuỷu, nhiều vũng vịnh kín gió thuận lợi xây dựng cảng nước sâu và nguồn lợi hải sản phong phú.',
      'Có diện tích đất phù sa màu mỡ trải dài ven biển để trồng cây lúa nước.',
      'Rừng ngập mặn phát triển với quy mô lớn nhất cả nước.',
      'Tài nguyên khoáng sản kim loại màu phong phú nhất nước ta.'
    ],
    correctAnswer: 0,
    explanation: 'Duyên hải Nam Trung Bộ có bờ biển khúc khuỷu, nhiều vũng vịnh sâu kín gió (Vân Phong, Cam Ranh, Dung Quất...) rất thuận lợi cho cảng biển nước sâu, đồng thời là một trong những ngư trường lớn nhất cả nước với các bãi tôm, bãi cá dồi dào.'
  }
];
