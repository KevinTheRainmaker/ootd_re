import 'package:flutter/material.dart';

enum Mood { passion, happy, calm, cozy, creative }

extension MoodColor on Mood {
  Color get color => switch (this) {
    Mood.passion => const Color(0xFFE53935),
    Mood.happy   => const Color(0xFFFDD835),
    Mood.calm    => const Color(0xFF1E88E5),
    Mood.cozy    => const Color(0xFF43A047),
    Mood.creative => const Color(0xFF8E24AA),
  };

  String get label => switch (this) {
    Mood.passion  => '열정',
    Mood.happy    => '행복',
    Mood.calm     => '차분',
    Mood.cozy     => '편안',
    Mood.creative => '창의',
  };

  static Mood fromString(String value) =>
    Mood.values.firstWhere((m) => m.name == value, orElse: () => Mood.happy);
}
