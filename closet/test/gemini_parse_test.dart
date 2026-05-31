import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:closet/shared/models/ootd_item.dart';

// GeminiService._parseItems는 private이므로 동일 로직을 추출해 테스트
List<OotdItem> parseItems(String rawText) {
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

void main() {
  group('Gemini _parseItems 로직', () {
    test('순수 JSON 배열 파싱', () {
      const raw = '''
[
  {"category": "top", "color": "화이트", "styleDescription": "오버핏 티셔츠", "brand": null},
  {"category": "bottom", "color": "블랙", "styleDescription": "슬림 팬츠", "brand": "ZARA"}
]
''';
      final items = parseItems(raw);
      expect(items.length, 2);
      expect(items[0].category, 'top');
      expect(items[0].color, '화이트');
      expect(items[1].brand, 'ZARA');
      expect(items[1].orderIdx, 1);
    });

    test('마크다운 코드블록 제거 후 파싱', () {
      const raw = '```json\n[{"category": "shoes", "color": "베이지", "styleDescription": "로퍼", "brand": null}]\n```';
      final items = parseItems(raw);
      expect(items.length, 1);
      expect(items[0].category, 'shoes');
    });

    test('error 키 포함 시 예외 발생', () {
      const raw = '{"error": "not_fashion"}';
      expect(() => parseItems(raw), throwsException);
    });

    test('빈 배열 반환', () {
      const raw = '[]';
      final items = parseItems(raw);
      expect(items, isEmpty);
    });

    test('category 누락 시 top으로 fallback', () {
      const raw = '[{"color": "레드", "styleDescription": "자켓", "brand": null}]';
      final items = parseItems(raw);
      expect(items[0].category, 'top');
    });

    test('id는 temp_인덱스 형식', () {
      const raw = '[{"category": "bag"}, {"category": "accessory"}]';
      final items = parseItems(raw);
      expect(items[0].id, 'temp_0');
      expect(items[1].id, 'temp_1');
    });
  });
}
