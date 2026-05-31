import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../weather_provider.dart';
import '../ai_recommend_provider.dart';
import '../../../shared/models/weather_data.dart';

class WeatherWidget extends ConsumerWidget {
  const WeatherWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncWeather = ref.watch(weatherProvider);

    return asyncWeather.when(
      data: (weather) => _WeatherContent(weather: weather),
      loading: () => const _WeatherSkeleton(),
      error: (_, __) => const _WeatherError(),
    );
  }
}

class _WeatherContent extends StatelessWidget {
  final WeatherData weather;
  const _WeatherContent({required this.weather});

  static const _themes = {
    'sunny': (
      gradient: [Color(0xFF87CEEB), Color(0xFFFFD580)],
      icon: Icons.wb_sunny_outlined,
      label: '맑음',
    ),
    'cloudy': (
      gradient: [Color(0xFFB0BEC5), Color(0xFF90A4AE)],
      icon: Icons.cloud_outlined,
      label: '흐림',
    ),
    'rainy': (
      gradient: [Color(0xFF546E7A), Color(0xFF37474F)],
      icon: Icons.umbrella_outlined,
      label: '비',
    ),
    'snowy': (
      gradient: [Color(0xFFECEFF1), Color(0xFFCFD8DC)],
      icon: Icons.ac_unit_outlined,
      label: '눈',
    ),
  };

  @override
  Widget build(BuildContext context) {
    final theme = _themes[weather.condition];
    final colors = theme?.gradient ?? const [Color(0xFF90A4AE), Color(0xFF78909C)];
    final icon = theme?.icon ?? Icons.cloud_outlined;
    final label = theme?.label ?? weather.condition;
    final tempInt = weather.temp.round();
    final textColor =
        weather.condition == 'snowy' ? Colors.black87 : Colors.white;
    final subColor =
        weather.condition == 'snowy' ? Colors.black54 : Colors.white70;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
      ),
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$tempInt°',
                      style: GoogleFonts.montserrat(
                        fontSize: 64,
                        fontWeight: FontWeight.w700,
                        color: textColor,
                        height: 1.0,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      label,
                      style: GoogleFonts.montserrat(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: subColor,
                        letterSpacing: 2,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(icon, size: 36, color: subColor),
            ],
          ),
          const Spacer(),
          Row(
            children: [
              _StatChip(
                label: '습도',
                value: '${weather.humidity.round()}%',
                textColor: textColor,
              ),
            ],
          ),
          const SizedBox(height: 8),
          _AiRecommendCard(subColor: subColor),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color textColor;
  const _StatChip(
      {required this.label, required this.value, required this.textColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white24,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        '$label $value',
        style: TextStyle(
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _AiRecommendCard extends ConsumerWidget {
  final Color subColor;
  const _AiRecommendCard({required this.subColor});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncRec = ref.watch(aiRecommendProvider);

    final message = asyncRec.when(
      data: (text) => text ?? 'AI 코디 추천을 준비 중이에요',
      loading: () => 'AI 코디 추천 로딩 중...',
      error: (_, __) => '오늘 날씨에 맞는 코디를 선택하세요',
    );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white24,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.auto_awesome, size: 14, color: subColor),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.montserrat(
                fontSize: 11,
                color: subColor,
                letterSpacing: 0.5,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _WeatherSkeleton extends StatelessWidget {
  const _WeatherSkeleton();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFFB0BEC5),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: const Center(
        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
      ),
    );
  }
}

class _WeatherError extends StatelessWidget {
  const _WeatherError();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFF78909C),
      alignment: Alignment.center,
      child: const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.cloud_off, color: Colors.white54, size: 28),
          SizedBox(height: 8),
          Text(
            '날씨 정보를 불러올 수 없습니다',
            style: TextStyle(color: Colors.white70, fontSize: 13),
          ),
        ],
      ),
    );
  }
}
