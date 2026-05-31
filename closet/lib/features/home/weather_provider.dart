import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/weather_service.dart';
import '../../shared/models/weather_data.dart';

final weatherServiceProvider = Provider<WeatherService>((ref) => WeatherService());

final weatherProvider = FutureProvider<WeatherData>((ref) {
  return ref.watch(weatherServiceProvider).getCurrentWeather();
});
