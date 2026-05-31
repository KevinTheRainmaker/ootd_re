import 'package:flutter_test/flutter_test.dart';
import 'package:closet/shared/models/ootd_record.dart';
import 'package:closet/shared/models/ootd_item.dart';

void main() {
  group('OotdRecord', () {
    final baseJson = {
      'id': 'rec-1',
      'user_id': 'user-1',
      'date': '2025-12-31',
      'original_image_url': 'https://example.com/img.jpg',
      'card_image_url': null,
      'mood': 'happy',
      'is_public': false,
    };

    test('fromJson 기본 파싱', () {
      final record = OotdRecord.fromJson(baseJson);
      expect(record.id, 'rec-1');
      expect(record.userId, 'user-1');
      expect(record.date, DateTime(2025, 12, 31));
      expect(record.mood, 'happy');
      expect(record.isPublic, false);
      expect(record.items, isEmpty);
    });

    test('fromJson 12월 날짜 경계 정상 파싱', () {
      final record = OotdRecord.fromJson({...baseJson, 'date': '2025-12-01'});
      expect(record.date.month, 12);
      expect(record.date.day, 1);
    });

    test('fromJson nested ootd_items 파싱', () {
      final json = {
        ...baseJson,
        'ootd_items': [
          {
            'id': 'item-1',
            'ootd_id': 'rec-1',
            'category': 'top',
            'brand': 'ZARA',
            'product_name': null,
            'style_description': '캐주얼 티셔츠',
            'color': '화이트',
            'order_idx': 0,
          }
        ],
      };
      final record = OotdRecord.fromJson(json);
      expect(record.items.length, 1);
      expect(record.items.first.category, 'top');
      expect(record.items.first.brand, 'ZARA');
      expect(record.items.first.color, '화이트');
    });

    test('toJson date는 YYYY-MM-DD 형식', () {
      final record = OotdRecord.fromJson(baseJson);
      final json = record.toJson();
      expect(json['date'], '2025-12-31');
    });

    test('copyWith isPublic 변경', () {
      final record = OotdRecord.fromJson(baseJson);
      final updated = record.copyWith(isPublic: true);
      expect(updated.isPublic, true);
      expect(updated.id, record.id);
    });
  });

  group('OotdItem', () {
    test('fromJson 파싱', () {
      final item = OotdItem.fromJson({
        'id': 'item-1',
        'ootd_id': 'rec-1',
        'category': 'shoes',
        'brand': null,
        'product_name': null,
        'style_description': null,
        'color': '블랙',
        'order_idx': 2,
      });
      expect(item.category, 'shoes');
      expect(item.color, '블랙');
      expect(item.brand, isNull);
      expect(item.orderIdx, 2);
    });

    test('toJson null 필드 포함', () {
      const item = OotdItem(
        id: 'item-1',
        ootdId: 'rec-1',
        category: 'bag',
        orderIdx: 0,
      );
      final json = item.toJson();
      expect(json['category'], 'bag');
      expect(json['brand'], isNull);
      expect(json['color'], isNull);
    });
  });
}
