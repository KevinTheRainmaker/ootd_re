import 'package:flutter_test/flutter_test.dart';
import 'package:closet/shared/models/weather_data.dart';

void main() {
  group('WeatherData.fromJson', () {
    test('OWM Clear 응답을 sunny로 파싱', () {
      final data = WeatherData.fromJson({
        'main': {'temp': 22.5, 'humidity': 65},
        'weather': [
          {'main': 'Clear', 'icon': '01d'}
        ],
      });
      expect(data.temp, 22.5);
      expect(data.humidity, 65.0);
      expect(data.condition, 'sunny');
      expect(data.iconCode, '01d');
    });

    test('OWM Rain 응답을 rainy로 파싱', () {
      final data = WeatherData.fromJson({
        'main': {'temp': 15.0, 'humidity': 90},
        'weather': [
          {'main': 'Rain', 'icon': '10d'}
        ],
      });
      expect(data.condition, 'rainy');
    });

    test('OWM Snow 응답을 snowy로 파싱', () {
      final data = WeatherData.fromJson({
        'main': {'temp': -2.0, 'humidity': 80},
        'weather': [
          {'main': 'Snow', 'icon': '13d'}
        ],
      });
      expect(data.condition, 'snowy');
      expect(data.temp, -2.0);
    });

    test('OWM Clouds 응답을 cloudy로 파싱', () {
      final data = WeatherData.fromJson({
        'main': {'temp': 18.3, 'humidity': 70},
        'weather': [
          {'main': 'Clouds', 'icon': '04d'}
        ],
      });
      expect(data.condition, 'cloudy');
    });

    test('알 수 없는 날씨 코드는 cloudy로 fallback', () {
      final data = WeatherData.fromJson({
        'main': {'temp': 20.0, 'humidity': 55},
        'weather': [
          {'main': 'Smoke', 'icon': '50d'}
        ],
      });
      expect(data.condition, 'cloudy');
    });
  });
}
