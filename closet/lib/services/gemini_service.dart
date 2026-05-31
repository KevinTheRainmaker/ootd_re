import 'dart:convert';
import 'dart:io';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../shared/models/ootd_item.dart';

class GeminiService {
  late final GenerativeModel _model;

  GeminiService() {
    _model = GenerativeModel(
      model: 'gemini-2.0-flash',
      apiKey: dotenv.env['GEMINI_API_KEY']!,
    );
  }

  Future<List<OotdItem>> analyzeOutfitImage(String imagePath) async {
    final imageBytes = await File(imagePath).readAsBytes();
    const prompt = '''
이 패션 사진을 분석하여 착용된 옷 아이템을 JSON 배열로 반환해주세요.
각 아이템 형식:
{"category": "top|bottom|outer|shoes|bag|accessory", "color": "색상", "styleDescription": "스타일 설명 20자 이내", "brand": null}
JSON 배열만 응답하세요. 마크다운 코드블록 없이 순수 JSON만. 패션 사진이 아니면 {"error": "not_fashion"}
''';
    final mime = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    final content = [
      Content.multi([
        TextPart(prompt),
        DataPart(mime, imageBytes),
      ])
    ];
    final response = await _model.generateContent(content);
    try {
      return _parseItems(response.text ?? '');
    } on FormatException {
      // JSON 파싱 실패 — 사용자가 수동으로 추가
      return [];
    } on Exception catch (e) {
      if (e.toString().contains('패션 사진이 아닙니다')) return [];
      rethrow;
    }
  }

  List<OotdItem> _parseItems(String rawText) {
    final cleaned = rawText.trim().replaceAll(RegExp(r'```json|```'), '').trim();
    final dynamic decoded = jsonDecode(cleaned);

    if (decoded is Map && decoded.containsKey('error')) {
      throw Exception('패션 사진이 아닙니다.');
    }

    if (decoded is! List) return [];

    return decoded.asMap().entries.map((entry) {
      final idx = entry.key;
      final item = entry.value as Map<String, dynamic>;
      return OotdItem(
        id: 'temp_$idx',
        ootdId: '',
        category: item['category'] as String? ?? 'top',
        color: item['color'] as String?,
        styleDescription: item['styleDescription'] as String?,
        brand: item['brand'] as String?,
        orderIdx: idx,
      );
    }).toList();
  }
}
