import 'package:flutter/material.dart';

Color weatherBackground(String condition) => switch (condition) {
  'Clear'             => const Color(0xFF87CEEB),
  'Clouds'            => const Color(0xFFB0BEC5),
  'Rain' || 'Drizzle' => const Color(0xFF546E7A),
  'Snow'              => const Color(0xFFECEFF1),
  'Thunderstorm'      => const Color(0xFF37474F),
  _                   => const Color(0xFF90A4AE),
};

String weatherLabel(String condition) => switch (condition) {
  'Clear'             => '맑음',
  'Clouds'            => '흐림',
  'Rain' || 'Drizzle' => '비',
  'Snow'              => '눈',
  'Thunderstorm'      => '천둥번개',
  _                   => condition,
};
