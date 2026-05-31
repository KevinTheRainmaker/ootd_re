import 'ootd_item.dart';

class OotdRecord {
  final String id;
  final String userId;
  final DateTime date;
  final String originalImageUrl;
  final String? cardImageUrl;
  final String mood; // 'passion'|'happy'|'calm'|'cozy'|'creative'
  final bool isPublic;
  final List<OotdItem> items;
  final Map<String, dynamic>? weatherSnapshot;

  const OotdRecord({
    required this.id,
    required this.userId,
    required this.date,
    required this.originalImageUrl,
    this.cardImageUrl,
    required this.mood,
    required this.isPublic,
    this.items = const [],
    this.weatherSnapshot,
  });

  factory OotdRecord.fromJson(Map<String, dynamic> json) {
    final rawItems = json['ootd_items'] as List<dynamic>?;
    return OotdRecord(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      date: DateTime.parse(json['date'] as String),
      originalImageUrl: json['original_image_url'] as String,
      cardImageUrl: json['card_image_url'] as String?,
      mood: json['mood'] as String? ?? 'happy',
      isPublic: json['is_public'] as bool? ?? false,
      items: rawItems?.map((e) => OotdItem.fromJson(e as Map<String, dynamic>)).toList() ?? [],
      weatherSnapshot: json['weather_snapshot'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'date': date.toIso8601String().split('T').first,
        'original_image_url': originalImageUrl,
        'card_image_url': cardImageUrl,
        'mood': mood,
        'is_public': isPublic,
        if (weatherSnapshot != null) 'weather_snapshot': weatherSnapshot,
      };

  OotdRecord copyWith({
    String? id,
    String? userId,
    DateTime? date,
    String? originalImageUrl,
    String? cardImageUrl,
    String? mood,
    bool? isPublic,
    List<OotdItem>? items,
    Map<String, dynamic>? weatherSnapshot,
  }) {
    return OotdRecord(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      date: date ?? this.date,
      originalImageUrl: originalImageUrl ?? this.originalImageUrl,
      cardImageUrl: cardImageUrl ?? this.cardImageUrl,
      mood: mood ?? this.mood,
      isPublic: isPublic ?? this.isPublic,
      items: items ?? this.items,
      weatherSnapshot: weatherSnapshot ?? this.weatherSnapshot,
    );
  }
}
