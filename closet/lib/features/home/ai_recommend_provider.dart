import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../../shared/models/weather_data.dart';
import 'weather_provider.dart';

final aiRecommendProvider = FutureProvider<String?>((ref) async {
  final asyncWeather = ref.watch(weatherProvider);
  return asyncWeather.whenData((weather) => _fetchRecommendation(weather)).value;
});

Future<String> _fetchRecommendation(WeatherData weather) async {
  final apiKey = dotenv.env['GEMINI_API_KEY'];
  if (apiKey == null || apiKey.isEmpty) return _fallback(weather.condition);

  final model = GenerativeModel(
    model: 'gemini-2.0-flash',
    apiKey: apiKey,
  );

  final prompt = '''
현재 날씨: ${_conditionLabel(weather.condition)}, 기온 ${weather.temp.round()}°C, 습도 ${weather.humidity.round()}%
이 날씨에 어울리는 패션 스타일을 한 줄(30자 이내)로 추천해주세요.
예시: "시원한 린넨 셔츠에 와이드 팬츠 조합 추천"
한 줄만 답하세요.''';

  try {
    final response = await model.generateContent([Content.text(prompt)]);
    final text = response.text?.trim() ?? '';
    return text.isEmpty ? _fallback(weather.condition) : text;
  } catch (_) {
    return _fallback(weather.condition);
  }
}

String _conditionLabel(String condition) => switch (condition) {
  'sunny' => '맑음',
  'cloudy' => '흐림',
  'rainy' => '비',
  'snowy' => '눈',
  _ => condition,
};

String _fallback(String condition) => switch (condition) {
  'sunny' => '가벼운 린넨 소재로 시원하게 코디하세요',
  'cloudy' => '얇은 가디건으로 레이어드 룩을 연출하세요',
  'rainy' => '방수 아우터와 어두운 톤으로 믹스하세요',
  'snowy' => '두꺼운 니트와 롱부츠로 따뜻하게 입으세요',
  _ => '오늘 날씨에 맞는 편안한 코디를 선택하세요',
};
