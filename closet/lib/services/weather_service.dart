import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:geolocator/geolocator.dart';
import '../shared/models/weather_data.dart';

class WeatherService {
  Future<WeatherData> getCurrentWeather() async {
    final position = await _determinePosition();
    final apiKey = dotenv.env['OPENWEATHERMAP_API_KEY']!;
    final url = 'https://api.openweathermap.org/data/2.5/weather'
        '?lat=${position.latitude}&lon=${position.longitude}'
        '&appid=$apiKey&units=metric&lang=kr';
    final response = await http.get(Uri.parse(url));
    if (response.statusCode != 200) {
      throw Exception('날씨 정보를 불러오지 못했습니다 (${response.statusCode})');
    }
    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return WeatherData.fromJson(json);
  }

  Future<Position> _determinePosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('위치 서비스가 비활성화되어 있습니다.');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('위치 권한이 거부되었습니다.');
      }
    }
    if (permission == LocationPermission.deniedForever) {
      throw Exception('위치 권한이 영구적으로 거부되었습니다. 설정에서 허용해 주세요.');
    }

    return await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.low,
      timeLimit: const Duration(seconds: 10),
    );
  }
}

