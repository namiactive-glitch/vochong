
import { GoogleGenAI, Type, GenerateContentParameters } from "@google/genai";
import { getAiClient, markKeyExhausted } from "./keyService";
import { CinematicPrompt, Screenplay, IdeaSuggestion, Episode, Scene, Character, ContinuityResult, StoryTheme, StoryIdea, StoryScript } from "../types";

// Helper function to call AI with automatic key rotation on 429 error
async function callAi(params: GenerateContentParameters): Promise<any> {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const { client, key } = getAiClient();
    try {
      const response = await client.models.generateContent(params);
      return response;
    } catch (error: any) {
      const errorMessage = error?.message || "";
      // Check for 429 (Too Many Requests) or Quota Exceeded
      if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
        console.warn(`API Key exhausted: ${key.substring(0, 8)}... Marking as exhausted and rotating.`);
        markKeyExhausted(key);
        attempts++;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Tất cả API Key đã hết lượt truy cập. Vui lòng thêm Key mới.");
}

const RULE_19_INSTRUCTION = "Bạn là một chuyên gia viết prompt video AI cho phim điện ảnh chuyên nghiệp, tối ưu cho các model AI video hàng đầu.\n" +
// ... (rest of instructions)
"Nhiệm vụ của bạn là tạo ra các prompt video '10 điểm' với phong cách GỌN GÀNG, SÚC TÍCH và LOGIC ĐƠN GIẢN như các kịch bản mẫu sau:\n\n" +
"1. QUY TẮC 3 GIÂY (3-SECOND RULE): Chia nhỏ 12 giây thành các mốc (0-3s, 3-6s, 6-9s, 9-12s). Mỗi mốc chỉ dùng 1-2 câu ngắn, tập trung vào hành động then chốt.\n" +
"2. ĐỘNG TỪ MẠNH & HỆ QUẢ VẬT LÝ: Sử dụng các động từ: crashes, collapses, shatters, sent flying, slams into. Mỗi hành động PHẢI đi kèm một hệ quả vật lý ngay lập tức.\n" +
"3. TỐI ƯU CÚ ĐÁ ĐIỆN ẢNH: Thường xuyên đưa vào các kỹ thuật: 360-degree spinning kick, flying kick, whirlwind kick, wall-jump kick. Mô tả rõ quỹ đạo: 'hits enemy directly', 'knocks off his feet'.\n" +
"4. BẢO TỒN CAMEO (NẾU CÓ): Bắt đầu Action bằng: 'Same cameo character, keep original cameo outfit. lower body wearing black pants and black shoes.' Không mô tả thêm trang phục.\n" +
"5. ĐỊNH DANH TỐI GIẢN: Dùng TÊN VIẾT HOA. Chỉ nhắc mối quan hệ (Wife of...) khi có >2 nhân vật chính cùng giới tính để tránh nhầm lẫn. Cảnh đơn lẻ chỉ dùng TÊN.\n" +
"6. CẤU TRÚC PROMPT GỌN (MẪU 10 ĐIỂM):\n" +
"    - Location: (Ngắn gọn)\n" +
"    - Time: (Ngắn gọn)\n" +
"    - Style: cinematic martial arts action\n" +
"    - Action: (Mô tả trực diện hành động và sự phá hủy môi trường. Ví dụ: '0-3s: HÙNG jumps onto a crate. 3-6s: delivers a flying kick. 6-9s: enemy crashes into a table. 9-12s: table breaks apart.')\n" +
"7. CẤM: Không dùng từ ngữ về góc máy, không kể chuyện dài dòng, không dùng tính từ cảm xúc.";

const STORY_STUDIO_INSTRUCTION = "Bạn là một biên kịch và chuyên gia viết prompt video AI đa tài. " +
"Nhiệm vụ của bạn là tạo ra các prompt video cho nhiều chủ đề khác nhau (Chủ tịch, Tình cảm, Nấu ăn, Hài hước...) " +
"với phong cách chuyên nghiệp, tập trung vào hành động vật lý, bối cảnh và chi tiết đặc tả.\n\n" +
"QUY TẮC QUAN TRỌNG:\n" +
"1. KHÔNG MẶC ĐỊNH HÀNH ĐỘNG VÕ THUẬT: Chỉ viết hành động đánh nhau nếu cốt truyện yêu cầu.\n" +
"2. QUY TẮC 3 GIÂY (3-SECOND RULE): Chia nhỏ 12 giây thành các mốc (0-3s, 3-6s, 6-9s, 9-12s). Mỗi mốc mô tả một diễn biến vật lý hoặc lời thoại cụ thể.\n" +
"3. MÔ TẢ KHÁCH QUAN & TỰ NHIÊN: Tuyệt đối không dùng các tính từ chủ quan như 'hài hước', 'vui nhộn', 'buồn bã', 'đáng sợ' trong phần Style. " +
"Sự hài hước hay cảm xúc phải đến từ tình huống truyện và hành động vật lý.\n" +
"4. XỬ LÝ HỘI THOẠI: Không mô tả kỹ thuật cử động môi (như 'miệng mấp máy'). Thay vào đó, hãy lồng trực tiếp lời thoại vào hành động của nhân vật theo cấu trúc: [TÊN] [hành động nói]: 'Lời thoại'. Ví dụ: 'HÙNG quát: 'RA RÓT NƯỚC!''. Không lặp lại tên nhân vật dư thừa. " +
"Model AI sẽ tự động khớp khẩu hình tự nhiên theo câu nói.\n" +
"5. CHẤT LƯỢNG HÌNH ẢNH (STYLE): Luôn bao gồm cụm từ: 'Hollywood Cinematic 8k, ultra-detailed'.\n" +
"6. BẢO TỒN CAMEO (NẾU CÓ): Bắt đầu Action bằng: 'Same cameo character, keep original cameo outfit. lower body wearing black pants and black shoes.' Không mô tả thêm trang phục.\n" +
"7. CẤM MÁU VÀ PHỤ ĐỀ: Tuyệt đối không mô tả máu (blood/gore) và không chèn chữ/phụ đề. " +
"Sử dụng cụm từ: 'no on-screen text or subtitles'.\n" +
"8. ĐỊNH DANH TỐI GIẢN: Dùng TÊN VIẾT HOA.\n" +
"9. CẤU TRÚC PROMPT:\n" +
"    - Location: (Ngắn gọn)\n" +
"    - Time: (Ngắn gọn)\n" +
"    - Style: Hollywood Cinematic 8k, ultra-detailed\n" +
"    - Action: (Mô tả hành động vật lý lồng ghép lời thoại [TÊN] [hành động nói]: '...' theo mốc thời gian).\n" +
"10. CÁI KẾT: Nếu là cảnh cuối, hãy đảm bảo nó mang tính hạ màn, giải quyết vấn đề hoặc tạo cảm xúc mạnh.";

const INTENSITY_INSTRUCTIONS = {
  'storytelling': "\nCẤP ĐỘ: NHỊP BÌNH THƯỜNG (STORYTELLING)\n- Phong cách: Tâm lý xã hội, có chiều sâu, ít đánh nhau.\n- Tỉ lệ cảnh hành động: ~20%.\n- Tập trung vào: Đối thoại, bối cảnh, cảm xúc nhân vật.\n- Nhịp độ: Chậm, sâu sắc.\n",
  'action-drama': "\nCẤP ĐỘ: KỊCH TÍNH VỪA PHẢI (ACTION-DRAMA)\n- Phong cách: Hành động điều tra, hình sự.\n- Tỉ lệ cảnh hành động: ~50%.\n- Tập trung vào: Rượt đuổi ngắn, xô xát, căng thẳng tăng dần.\n- Nhịp độ: Trung bình, bùng nổ cuối tập.\n",
  'hardcore': "\nCẤP ĐỘ: ĐỘC CHIẾN LIÊN HOÀN (HARDCORE ACTION)\n- Phong cách: Đánh nhau liên tục từ đầu đến cuối.\n- Tỉ lệ cảnh hành động: 90% - 100%.\n- Tập trung vào: Va chạm vật lý mạnh, chiến đấu tốc độ cao, liên hoàn đòn.\n- Nhịp độ: Cực nhanh, dồn dập.\n"
};

export const suggestIdeas = async (mode: 'dialogue' | 'no-dialogue' = 'dialogue'): Promise<IdeaSuggestion[]> => {
  const dialogueInstruction = mode === 'no-dialogue' ? " (Hài không thoại, tập trung vào hành động và biểu cảm)" : " (Hài có thoại)";
  const response = await callAi({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: "Đề xuất 5 chủ đề phim hài hước vợ chồng đang hot trend" + dialogueInstruction + " (Giấu quỹ đen, Vợ bắt nạt chồng, Chồng nấu ăn, Mua sắm quá đà, Ra mắt nhà ngoại...). Mỗi chủ đề gồm tiêu đề và mô tả ngắn. VIẾT BẰNG TIẾNG VIỆT CÓ DẤU." }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "description"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const generateScreenplay = async (
  idea: string, 
  numEpisodes: number, 
  durationPerEpisode: number,
  mode: 'dialogue' | 'no-dialogue' = 'dialogue'
): Promise<Screenplay> => {
  const dialogueInstruction = mode === 'no-dialogue'
    ? "ĐÂY LÀ PHIM HÀI KHÔNG THOẠI. Toàn bộ kịch bản phải tập trung vào NGÔN NGỮ HÌNH THỂ, biểu cảm và hành động vật lý để tạo ra tiếng cười mà không cần bất kỳ lời thoại nào."
    : "Kịch bản có lời thoại hài hước giữa các nhân vật.";

  const response = await callAi({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: "Dựa trên ý tưởng: \"" + idea + "\", hãy viết kịch bản tổng thể cho bộ phim gồm " + numEpisodes + " tập. " + dialogueInstruction + " Tóm tắt nội dung chi tiết cho từng tập. VIẾT BẰNG TIẾNG VIỆT CÓ DẤU." }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallPlot: { type: Type.STRING },
          episodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                title: { type: Type.STRING },
                summary: { type: Type.STRING }
              },
              required: ["id", "title", "summary"]
            }
          }
        },
        required: ["overallPlot", "episodes"]
      }
    }
  });
  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    episodes: data.episodes.map((ep: any) => ({ 
      ...ep, 
      duration: durationPerEpisode, 
      scenes: [] 
    }))
  };
};

export const generateContinuityEpisode = async (
  previousScript: string, 
  episodeNumber: number, 
  duration: number,
  intensityLevel: 'storytelling' | 'action-drama' | 'hardcore',
  nextEpisodeIdea?: string,
  mode: 'dialogue' | 'no-dialogue' = 'dialogue'
): Promise<ContinuityResult> => {
  const numScenes = Math.ceil((duration * 60) / 12);

  const dialogueInstruction = mode === 'no-dialogue'
    ? "ĐÂY LÀ PHIM HÀI KHÔNG THOẠI. Toàn bộ kịch bản phải tập trung vào NGÔN NGỮ HÌNH THỂ, biểu cảm và hành động vật lý để tạo ra tiếng cười mà không cần bất kỳ lời thoại nào."
    : "Kịch bản có lời thoại hài hước giữa các nhân vật.";

  const prompt = `Dựa trên kịch bản các tập trước (Tập 1 đến Tập ${episodeNumber - 1}):
"${previousScript}"

Nhiệm vụ: Viết tiếp Tập ${episodeNumber}. ${dialogueInstruction}
${nextEpisodeIdea ? `Ý tưởng cho tập này: "${nextEpisodeIdea}" (Hãy triển khai ý tưởng này một cách suôn sẻ, kịch tính và hay hơn).` : `Hãy tự động viết tiếp diễn biến kịch tính cho Tập ${episodeNumber} dựa trên mạch truyện cũ.`}

Thời lượng tập này: ${duration} phút.
${INTENSITY_INSTRUCTIONS[intensityLevel]}

YÊU CẦU:
1. Viết tiêu đề và tóm tắt nội dung cực hay cho Tập ${episodeNumber}. VIẾT BẰNG TIẾNG VIỆT CÓ DẤU.
2. Chia thành ${numScenes} cảnh quay chi tiết (mỗi cảnh tương ứng 12 giây). VIẾT BẰNG TIẾNG VIỆT CÓ DẤU.
3. Đảm bảo tính liên tục (Continuity) về nhân vật, bối cảnh và mạch truyện.
4. Mỗi cảnh phải mô tả hành động theo logic HÀNH ĐỘNG - HỆ QUẢ (Action-Impact): mô tả đòn đánh kèm kết quả vật lý (vỡ bàn, văng xa, đổ sụp).
5. ĐỊNH DANH NHÂN VẬT: Chỉ sử dụng TÊN VIẾT HOA trong ngoặc vuông [TÊN]. Không nhắc tiểu sử rườm rà.
6. TOÀN BỘ NỘI DUNG TRẢ VỀ (TIÊU ĐỀ, TÓM TẮT, MÔ TẢ CẢNH) PHẢI LÀ TIẾNG VIỆT CÓ DẤU CHUẨN.

QUY TẮC LIÊN KẾT CẢNH (CINEMATIC CONTINUITY):
- Móc nối hành động (Action Bridge).
- Chuyển đổi bối cảnh (Location Bridge).
- Kế thừa môi trường (Environment Persistence).
- GIỚI HẠN NHÂN VẬT: Mỗi cảnh CHỈ ĐƯỢC PHÉP có tối đa 3 nhân vật chính.`;

  const response = await callAi({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING }
              },
              required: ["description"]
            }
          }
        },
        required: ["title", "summary", "scenes"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    title: data.title,
    summary: data.summary,
    scenes: data.scenes.map((s: any, index: number) => ({
      id: "continuity-scene-" + Date.now() + "-" + index,
      description: s.description,
      characters: [],
      loading: false,
      progress: 0
    }))
  };
};

export const breakdownScenes = async (
  episodeSummary: string, 
  numScenes: number, 
  previousContext: string, 
  intensityLevel: 'storytelling' | 'action-drama' | 'hardcore',
  mode: 'dialogue' | 'no-dialogue' = 'dialogue'
): Promise<Scene[]> => {
  const dialogueInstruction = mode === 'no-dialogue'
    ? "ĐÂY LÀ PHIM HÀI KHÔNG THOẠI. Tập trung tối đa vào NGÔN NGỮ HÌNH THỂ (body language), biểu cảm khuôn mặt chi tiết, sắc thái, hành động và các động tác vật lý của nhân vật để truyền tải nội dung hài hước mà không cần lời thoại."
    : "Mô tả hành động hài hước và phản ứng của nhân vật còn lại (Ví dụ: [HÙNG] lén lút giấu tiền vào lọ hoa, [LAN] bất ngờ xuất hiện phía sau).";

  const prompt = "Dựa trên tóm tắt tập phim hiện tại: \"" + episodeSummary + "\"\n" +
    "Và bối cảnh từ tập trước (nếu có): \"" + previousContext + "\"\n\n" +
    INTENSITY_INSTRUCTIONS[intensityLevel] + "\n" +
    "Hãy chia thành " + numScenes + " cảnh quay chi tiết (mỗi cảnh tương ứng 12 giây). VIẾT BẰNG TIẾNG VIỆT CÓ DẤU.\n\n" +
    "QUY TẮC VIẾT CẢNH (COMEDY LOGIC):\n" +
    "1. " + dialogueInstruction + " VIẾT BẰNG TIẾNG VIỆT CÓ DẤU.\n" +
    "2. Sử dụng các động từ mô tả biểu cảm: giật mình, lấm lét, trợn mắt, cười trừ, sắc thái biểu cảm chi tiết.\n\n" +
    "QUY TẮC LIÊN KẾT CẢNH (CINEMATIC CONTINUITY):\n" +
    "1. Móc nối hành động (Action Bridge): Cảnh N kết thúc ở tư thế nào, thì Cảnh N+1 phải bắt đầu bằng việc tái hiện lại tư thế đó.\n" +
    "2. Chuyển đổi bối cảnh (Location Bridge): Nếu thay đổi địa điểm, phải có hành động di chuyển hợp lý.\n" +
    "3. Kế thừa môi trường: Các vật dụng trong cảnh (tiền, lọ hoa, chổi...) phải được duy trì vị trí.\n\n" +
    "YÊU CẦU QUAN TRỌNG CHO MỖI CẢNH:\n" +
    "1. GIỚI HẠN NHÂN VẬT: Mỗi cảnh CHỈ ĐƯỢC PHÉP có tối đa 3 nhân vật chính.\n" +
    "2. Phải nhắc lại đầy đủ: Địa điểm, Thời gian, Bối cảnh.\n" +
    "3. SỬ DỤNG ĐỊNH DANH NHÂN VẬT TỐI GIẢN: Chỉ sử dụng TÊN VIẾT HOA trong ngoặc vuông (Ví dụ: \"[HÙNG]\", \"[LAN]\").\n" +
    "4. TOÀN BỘ MÔ TẢ CẢNH PHẢI LÀ TIẾNG VIỆT CÓ DẤU CHUẨN.\n";

  const response = await callAi({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING }
          },
          required: ["description"]
        }
      }
    }
  });
  const scenes = JSON.parse(response.text || "[]");
  return scenes.map((s: any, index: number) => ({
    id: "scene-" + Date.now() + "-" + index,
    description: s.description,
    characters: [],
    loading: false,
    progress: 0
  }));
};

export const suggestStoryIdea = async (theme: StoryTheme, mode: 'dialogue' | 'no-dialogue' = 'dialogue'): Promise<string> => {
  const themeNames: Record<StoryTheme, string> = {
    'ceo-reveal': 'Chồng giấu quỹ đen',
    'inspirational': 'Vợ chồng đồng lòng',
    'emotional-family': 'Tình cảm vợ chồng',
    'comedy': 'Hài hước vợ chồng',
    'culinary': 'Vợ nấu cơm chồng rửa bát',
    'horror': 'Vợ là sư tử hà đông',
    'historical': 'Vợ chồng xuyên không'
  };

  const dialogueInstruction = mode === 'no-dialogue' ? " (Hài không thoại, tập trung vào hành động và biểu cảm)" : "";

  const response = await callAi({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `Hãy gợi ý một ý tưởng kịch bản phim ngắn cực hay, gây cấn và cảm động cho chủ đề: "${themeNames[theme]}"${dialogueInstruction}. Ý tưởng phải có mở đầu, diễn biến và một cái kết ấn tượng. VIẾT BẰNG TIẾNG VIỆT CÓ DẤU.` }] }],
  });
  return response.text || "";
};

export const developStoryScript = async (
  theme: StoryTheme,
  idea: string,
  numEpisodes: number,
  durationPerEpisode: number,
  mode: 'dialogue' | 'no-dialogue' = 'dialogue'
): Promise<StoryScript> => {
  const numScenesPerEpisode = Math.ceil((durationPerEpisode * 60) / 12);

  const dialogueInstruction = mode === 'no-dialogue'
    ? "ĐÂY LÀ PHIM HÀI KHÔNG THOẠI. Toàn bộ kịch bản phải tập trung vào NGÔN NGỮ HÌNH THỂ, biểu cảm và hành động vật lý để tạo ra tiếng cười mà không cần bất kỳ lời thoại nào."
    : "Kịch bản có lời thoại hài hước giữa các nhân vật.";

  const prompt = `Bạn là một biên kịch chuyên nghiệp. Dựa trên chủ đề "${theme}" và ý tưởng: "${idea}".
Hãy phát triển thành một bộ phim gồm ${numEpisodes} tập. Mỗi tập dài ${durationPerEpisode} phút. ${dialogueInstruction}

YÊU CẦU:
1. Viết tiêu đề và tóm tắt tổng thể cho bộ phim. VIẾT BẰNG TIẾNG VIỆT CÓ DẤU.
2. Với mỗi tập, hãy viết tiêu đề, tóm tắt nội dung. VIẾT BẰNG TIẾNG VIỆT CÓ DẤU.
3. Chia mỗi tập thành ${numScenesPerEpisode} cảnh quay chi tiết (mỗi cảnh 12 giây). VIẾT BẰNG TIẾNG VIỆT CÓ DẤU.
4. ĐẢM BẢO CÁI KẾT: Cảnh cuối cùng của tập cuối cùng phải là một cái kết trọn vẹn, giải quyết xung đột hoặc để lại cảm xúc mạnh mẽ.
5. PHONG CÁCH: Phù hợp với chủ đề "${theme}". Nếu là hài hước thì phải vui nhộn, nếu là tình cảm thì phải sâu lắng, nếu là chủ tịch thì phải kịch tính.
6. ĐỊNH DANH NHÂN VẬT: Sử dụng TÊN VIẾT HOA trong ngoặc vuông [TÊN].
7. TOÀN BỘ NỘI DUNG TRẢ VỀ PHẢI LÀ TIẾNG VIỆT CÓ DẤU CHUẨN.`;

  const response = await callAi({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          episodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                scenes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      description: { type: Type.STRING }
                    },
                    required: ["description"]
                  }
                }
              },
              required: ["id", "title", "summary", "scenes"]
            }
          }
        },
        required: ["title", "summary", "episodes"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return data;
};

export const generateStoryPrompt = async (
  sceneDescription: string,
  context: string,
  characters: Character[],
  theme: StoryTheme,
  previousSceneDescription?: string,
  previousTechnicalPrompt?: string,
  isLastScene?: boolean,
  mode: 'dialogue' | 'no-dialogue' = 'dialogue'
): Promise<CinematicPrompt> => {
  
  let characterInstructions = "";
  const anyCameo = characters.some(c => c.useCameoOutfit);

  if (characters && characters.length > 0) {
    const activeCharacters = characters.filter(c => 
      sceneDescription.toLowerCase().includes(c.name.toLowerCase())
    );

    if (activeCharacters.length > 0) {
      characterInstructions = `DANH SÁCH NHÂN VẬT (TỐI ĐA 3): \n`;
      activeCharacters.slice(0, 3).forEach(char => {
        const cameoNote = char.useCameoOutfit ? " [CHẾ ĐỘ CAMEO ĐANG BẬT - CẤM MÔ TẢ TRANG PHỤC]" : "";
        characterInstructions += `- ${char.name}${cameoNote}\n`;
      });
    }
  }

  const dialogueInstruction = mode === 'no-dialogue' 
    ? "ĐÂY LÀ PHIM HÀI KHÔNG THOẠI. Tuyệt đối KHÔNG có lời thoại. Hãy tập trung tối đa vào NGÔN NGỮ HÌNH THỂ (body language), biểu cảm khuôn mặt chi tiết (trợn mắt, bĩu môi, nháy mắt), sắc thái và các động tác vật lý (giật mình, lén lút, vụng về) để truyền tải nội dung hài hước. Thêm yêu cầu 'No dialogue, visual storytelling through body language and facial expressions' vào prompt."
    : "Mô tả hành động vật lý lồng ghép lời thoại trực tiếp [TÊN] [hành động nói]: '...'";

  const promptText = `HÃY TẠO PROMPT VIDEO AI CHO CHỦ ĐỀ: ${theme.toUpperCase()}\n\n` +
    `BỐI CẢNH TỔNG QUAN: ${context}\n` +
    `DIỄN BIẾN CẢNH NÀY: ${sceneDescription}\n` +
    (isLastScene ? `ĐÂY LÀ CẢNH KẾT THÚC PHIM. HÃY TẠO CẢM GIÁC HẠ MÀN.\n` : "") +
    (previousTechnicalPrompt ? `KẾ THỪA TỪ CẢNH TRƯỚC: ${previousTechnicalPrompt}\n` : "") +
    `PHONG CÁCH: Phù hợp với chủ đề ${theme}. TUYỆT ĐỐI KHÔNG CÓ MÁU, KHÔNG CÓ CHỮ.\n\n` +
    characterInstructions + "\n\n" +
    `YÊU CẦU CẤU TRÚC:\n` +
    `- Location: ...\n` +
    `- Time: ...\n` +
    `- Style: Hollywood Cinematic 8k, ultra-detailed\n` +
    `- Action: (${anyCameo ? "BẮT ĐẦU bằng câu: 'Same cameo character, keep original cameo outfit. lower body wearing black pants and black shoes.' " : ""}${dialogueInstruction} theo mốc 0-3s, 3-6s, 6-9s, 9-12s. no on-screen text or subtitles.)\n\n` +
    `DỊCH THUẬT: Bản dịch Tiếng Việt phải dùng: 'Phong cách: ...' cho Style, và 'Nhân vật giữ nguyên trang phục cameo gốc' cho phần Action (nếu có).`;

  const response = await callAi({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: promptText }] }],
    config: {
      systemInstruction: STORY_STUDIO_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING },
          translation: { type: Type.STRING },
          chinesePrompt: { type: Type.STRING }
        },
        required: ["prompt", "translation", "chinesePrompt"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const generateFinalPrompt = async (
  sceneDescription: string, 
  context: string, 
  characters: Character[], 
  intensityLevel: 'storytelling' | 'action-drama' | 'hardcore', 
  previousSceneDescription?: string, 
  previousTechnicalPrompt?: string, 
  isLateScene?: boolean,
  mode: 'dialogue' | 'no-dialogue' = 'dialogue'
): Promise<CinematicPrompt> => {
  
  let characterInstructions = "";
  const anyCameo = characters.some(c => c.useCameoOutfit);

  if (characters && characters.length > 0) {
    // Lọc chỉ lấy những nhân vật thực sự xuất hiện trong mô tả cảnh
    const activeCharacters = characters.filter(c => 
      sceneDescription.toLowerCase().includes(c.name.toLowerCase())
    );

    if (activeCharacters.length > 0) {
      const sortedCharacters = [...activeCharacters].sort((a, b) => {
        if (a.isMain === b.isMain) return 0;
        return a.isMain ? -1 : 1;
      });

      const mainCharacters = sortedCharacters.filter(c => c.isMain);
      const supportingCharacters = sortedCharacters.filter(c => !c.isMain);
      
      const topMain = mainCharacters.slice(0, 3);
      const excludedMain = mainCharacters.slice(3);

      const relationshipInstruction = topMain.length > 1 
        ? "CHỈ nhắc tới mối quan hệ (ví dụ: Wife of HÙNG) nếu cần thiết để phân biệt giữa các nhân vật chính trong cảnh."
        : "TUYỆT ĐỐI KHÔNG nhắc tới mối quan hệ hay tiểu sử nhân vật, chỉ sử dụng TÊN VIẾT HOA.";

      characterInstructions = `DANH SÁCH NHÂN VẬT VÀ QUY TẮC TRANG PHỤC (CHỈ SỬ DỤNG TỐI ĐA 3 NHÂN VẬT NÀY):
${relationshipInstruction}
`;
      
      topMain.forEach((char) => {
        const charDesc = char.description ? ` (${char.description})` : "";
        const cameoNote = char.useCameoOutfit ? " [CHẾ ĐỘ CAMEO ĐANG BẬT - CẤM MÔ TẢ TRANG PHỤC]" : "";
        characterInstructions += "- " + char.name + charDesc + cameoNote + ": Đây là nhân vật chính. " + (char.useCameoOutfit ? "LƯU Ý: Tuyệt đối KHÔNG được đưa bất kỳ chi tiết trang phục nào từ phần mô tả này vào prompt vì nhân vật đang dùng trang phục Cameo cố định." : "") + "\n";
      });

      supportingCharacters.forEach((char) => {
        const charDesc = char.description ? ` (${char.description})` : "";
        const cameoNote = char.useCameoOutfit ? " [CHẾ ĐỘ CAMEO ĐANG BẬT - CẤM MÔ TẢ TRANG PHỤC]" : "";
        characterInstructions += "- " + char.name + charDesc + cameoNote + ": Đây là nhân vật phụ. " + (char.useCameoOutfit ? "LƯU Ý: Tuyệt đối KHÔNG được đưa bất kỳ chi tiết trang phục nào từ phần mô tả này vào prompt vì nhân vật đang dùng trang phục Cameo cố định." : "") + "\n";
      });

      if (anyCameo) {
        characterInstructions += "\nQUY TẮC TRANG PHỤC CAMEO: All characters keep original cameo outfit, no changes. lower body wearing black pants and black shoes. (BẮT BUỘC nhắc câu này ở đầu phần Action vì có nhân vật sử dụng Cameo).\n";
      }

      if (excludedMain.length > 0) {
        characterInstructions += `\nLƯU Ý QUAN TRỌNG: Tuyệt đối KHÔNG đưa các nhân vật sau vào prompt này: ${excludedMain.map(c => c.name).join(', ')}. Chỉ tập trung vào 3 nhân vật chính đã liệt kê ở trên.\n`;
      }
    } else {
      characterInstructions = "Hãy tự xác định các nhân vật và trang phục phù hợp dựa trên mô tả cảnh.";
    }
  } else {
    characterInstructions = "Hãy tự xác định các nhân vật và trang phục phù hợp.";
  }

  const dialogueInstruction = mode === 'no-dialogue' 
    ? "ĐÂY LÀ PHIM HÀI KHÔNG THOẠI. Tuyệt đối KHÔNG có lời thoại. Hãy tập trung tối đa vào NGÔN NGỮ HÌNH THỂ (body language), biểu cảm khuôn mặt chi tiết (trợn mắt, bĩu môi, nháy mắt), sắc thái và các động tác vật lý (giật mình, lén lút, vụng về) để truyền tải nội dung hài hước. Thêm yêu cầu 'No dialogue, visual storytelling through body language and facial expressions' vào prompt."
    : "PHẢI áp dụng VÒNG LẶP HÀNH ĐỘNG-PHẢN ỨNG hài hước lồng ghép lời thoại trực tiếp [TÊN] [hành động nói]: '...'";

  const layer1 = "LỚP 1: BỐI CẢNH TỔNG QUAN\n" + context + "\n";
  const layer2 = "LỚP 2: DIỄN BIẾN PHÂN CẢNH\n" + sceneDescription + "\n";
  
  let layer3 = "LỚP 3: KẾ THỪA KỸ THUẬT\n";
  if (previousTechnicalPrompt) {
    layer3 += "TRUY XUẤT TỪ PROMPT TRƯỚC: \"" + previousTechnicalPrompt + "\"\n" +
              "HÃY TRÍCH XUẤT 'MÃ GEN' KỸ THUẬT (Ánh sáng, Vị trí vật lý, Tình trạng môi trường) VÀ SAO CHÉP VÀO PROMPT MỚI.\n";
  }
  if (previousSceneDescription) {
    layer3 += "MÓC NỐI HÀNH ĐỘNG: Cảnh trước kết thúc tại \"" + previousSceneDescription + "\". Đảm bảo 2 giây đầu tái hiện lại tư thế này.\n";
  }

  const promptText = "HÃY THỰC HIỆN QUY TRÌNH 3 LỚP ĐỂ TẠO PROMPT VIDEO AI HÀI HƯỚC VỢ CHỒNG:\n\n" +
    layer1 + "\n" +
    layer2 + "\n" +
    layer3 + "\n" +
    "Cấp độ nhịp phim: " + intensityLevel.toUpperCase() + ". \n" +
    "Từ khóa phong cách bắt buộc: cinematic comedy, vibrant colors.\n\n" +
    characterInstructions + "\n\n" +
    "YÊU CẦU ĐẶC BIỆT (CẤU TRÚC BẤT BIẾN):\n" +
    "1. Ngôn ngữ: TIẾNG ANH điện ảnh tối giản (Minimalist Cinematic English).\n" +
    "2. CẤU TRÚC BẮT BUỘC (KHÔNG ĐƯỢC THIẾU BẤT KỲ MỤC NÀO):\n" +
    "   - Location: (Địa điểm cụ thể)\n" +
    "   - Time: (Thời gian cụ thể)\n" +
    "   - Style: Hollywood Cinematic 8k, ultra-detailed, cinematic comedy, vibrant colors\n" +
    "   - Action: (" + (anyCameo ? "BẮT ĐẦU bằng câu: 'Same cameo character, keep original cameo outfit.' " : "") + "Sau đó mô tả hành động theo QUY TẮC 3 GIÂY: 0-3s, 3-6s, 6-9s, 9-12s. SỬ DỤNG TÊN VIẾT HOA (Ví dụ: HÙNG, LAN) kèm vai trò ở lần nhắc đầu tiên. " + dialogueInstruction + ". TUYỆT ĐỐI không sử dụng quá 3 nhân vật chính trong một prompt. " + (anyCameo ? "TUYỆT ĐỐI KHÔNG mô tả trang phục cho các nhân vật có đánh dấu CAMEO." : "Mô tả trang phục dựa trên danh sách nhân vật được cung cấp.") + ").\n" +
    "3. TỐI GIẢN HÀNH ĐỘNG: Chỉ mô tả SỰ KIỆN và TÌNH HUỐNG khách quan.\n" +
    "4. CẤM CHỈ ĐỊNH GÓC MÁY: Không dùng bất kỳ từ ngữ nào về góc máy.\n" +
    "5. DỊCH THUẬT ĐA NGÔN NGỮ (FULL MIRROR): Bản dịch Tiếng Việt phải sử dụng cụm từ: 'Phong cách: Hài hước điện ảnh' cho phần Style, và 'Nhân vật giữ nguyên trang phục cameo gốc' cho phần bắt đầu của Action (nếu có cameo). Bản dịch Tiếng Trung (Giản thể) cũng phải khớp 100% về cấu trúc và nội dung.";

  const response = await callAi({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: promptText }] }],
    config: {
      systemInstruction: RULE_19_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING },
          translation: { type: Type.STRING },
          chinesePrompt: { type: Type.STRING }
        },
        required: ["prompt", "translation", "chinesePrompt"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};
