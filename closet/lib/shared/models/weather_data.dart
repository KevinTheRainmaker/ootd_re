class WeatherData {
  final double temp;
  final double humidity;
  final String condition; // 'sunny'|'cloudy'|'rainy'|'snowy'
  final String iconCode;

  const WeatherData({
    required this.temp,
    required this.humidity,
    required this.condition,
    required this.iconCode,
  });

  factory WeatherData.fromJson(Map<String, dynamic> json) {
    final weather = (json['weather'] as List).first as Map<String, dynamic>;
    final main = json['main'] as Map<String, dynamic>;
    return WeatherData(
      temp: (main['temp'] as num).toDouble(),
      humidity: (main['humidity'] as num).toDouble(),
      condition: _mapCondition(weather['main'] as String),
      iconCode: weather['icon'] as String,
    );
  }

  static String _mapCondition(String owmMain) {
    switch (owmMain.toLowerCase()) {
      case 'clear':
        return 'sunny';
      case 'clouds':
        return 'cloudy';
      case 'rain':
      case 'drizzle':
      case 'thunderstorm':
        return 'rainy';
      case 'snow':
        return 'snowy';
      default:
        return 'cloudy';
    }
  }
}
