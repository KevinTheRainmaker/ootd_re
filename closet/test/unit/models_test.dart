import 'package:flutter_test/flutter_test.dart';
import 'package:closet/shared/models/ootd_item.dart';
import 'package:closet/shared/models/ootd_record.dart';
import 'package:closet/shared/models/weather_data.dart';

void main() {
  group('OotdItem', () {
    test('fromJson 정상 파싱', () {
      final json = {
        'id': 'item-1',
        'ootd_id': 'ootd-1',
        'category': 'top',
        'brand': 'Zara',
        'product_name': null,
        'style_description': '오버핏 셔츠',
        'color': '화이트',
        'order_idx': 0,
      };

      final item = OotdItem.fromJson(json);

      expect(item.id, 'item-1');
      expect(item.ootdId, 'ootd-1');
      expect(item.category, 'top');
      expect(item.brand, 'Zara');
      expect(item.productName, isNull);
      expect(item.color, '화이트');
      expect(item.orderIdx, 0);
    });

    test('toJson 라운드트립 — fromJson(toJson(item)) == item', () {
      const item = OotdItem(
        id: 'item-2',
        ootdId: 'ootd-2',
        category: 'bottom',
        brand: null,
        color: '블랙',
        orderIdx: 1,
      );

      final roundTripped = OotdItem.fromJson(item.toJson());

      expect(roundTripped.id, item.id);
      expect(roundTripped.category, item.category);
      expect(roundTripped.brand, isNull);
      expect(roundTripped.color, item.color);
      expect(roundTripped.orderIdx, item.orderIdx);
    });

    test('copyWith — 변경된 필드만 갱신', () {
      const original = OotdItem(
        id: 'item-3',
        ootdId: 'ootd-3',
        category: 'shoes',
        color: '베이지',
        orderIdx: 2,
      );

      final updated = original.copyWith(color: '브라운', brand: 'Nike');

      expect(updated.id, original.id);
      expect(updated.category, original.category);
      expect(updated.color, '브라운');
      expect(updated.brand, 'Nike');
      expect(updated.orderIdx, original.orderIdx);
    });
  });

  group('WeatherData', () {
    Map<String, dynamic> owmJson({
      required String main,
      required String icon,
      required double temp,
      required double humidity,
    }) =>
        {
          'weather': [
            {'main': main, 'icon': icon}
          ],
          'main': {'temp': temp, 'humidity': humidity},
        };

    test('Clear → sunny 매핑', () {
      final data = WeatherData.fromJson(
          owmJson(main: 'Clear', icon: '01d', temp: 24.5, humidity: 40));

      expect(data.condition, 'sunny');
      expect(data.temp, 24.5);
      expect(data.humidity, 40);
      expect(data.iconCode, '01d');
    });

    test('Rain → rainy 매핑', () {
      final data = WeatherData.fromJson(
          owmJson(main: 'Rain', icon: '10d', temp: 18.0, humidity: 80));

      expect(data.condition, 'rainy');
    });

    test('Thunderstorm → rainy 매핑', () {
      final data = WeatherData.fromJson(
          owmJson(main: 'Thunderstorm', icon: '11d', temp: 15.0, humidity: 90));

      expect(data.condition, 'rainy');
    });

    test('Snow → snowy 매핑', () {
      final data = WeatherData.fromJson(
          owmJson(main: 'Snow', icon: '13d', temp: -2.0, humidity: 70));

      expect(data.condition, 'snowy');
    });

    test('알 수 없는 condition → cloudy 기본값', () {
      final data = WeatherData.fromJson(
          owmJson(main: 'Fog', icon: '50d', temp: 12.0, humidity: 95));

      expect(data.condition, 'cloudy');
    });
  });

  group('OotdRecord', () {
    test('fromJson — ootd_items 포함 파싱', () {
      final json = {
        'id': 'record-1',
        'user_id': 'user-1',
        'date': '2026-05-31',
        'original_image_url': 'https://example.com/img.jpg',
        'card_image_url': null,
        'mood': 'happy',
        'is_public': false,
        'ootd_items': [
          {
            'id': 'item-1',
            'ootd_id': 'record-1',
            'category': 'top',
            'brand': null,
            'product_name': null,
            'style_description': null,
            'color': '화이트',
            'order_idx': 0,
          }
        ],
      };

      final record = OotdRecord.fromJson(json);

      expect(record.id, 'record-1');
      expect(record.mood, 'happy');
      expect(record.isPublic, isFalse);
      expect(record.items, hasLength(1));
      expect(record.items.first.category, 'top');
      expect(record.date, DateTime(2026, 5, 31));
    });

    test('fromJson — ootd_items null이면 빈 리스트', () {
      final json = {
        'id': 'record-2',
        'user_id': 'user-1',
        'date': '2026-05-31',
        'original_image_url': 'https://example.com/img.jpg',
        'mood': 'calm',
        'is_public': true,
        'ootd_items': null,
      };

      final record = OotdRecord.fromJson(json);

      expect(record.items, isEmpty);
      expect(record.isPublic, isTrue);
    });

    test('toJson — date가 yyyy-MM-dd 형식으로 직렬화', () {
      final record = OotdRecord(
        id: 'record-3',
        userId: 'user-1',
        date: DateTime(2026, 1, 5),
        originalImageUrl: 'https://example.com/img.jpg',
        mood: 'cozy',
        isPublic: false,
      );

      final json = record.toJson();

      expect(json['date'], '2026-01-05');
      expect(json['mood'], 'cozy');
    });
  });
}
