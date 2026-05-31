import 'package:supabase_flutter/supabase_flutter.dart';
import '../shared/models/ootd_record.dart';
import '../shared/models/ootd_item.dart';

class OotdService {
  final _supabase = Supabase.instance.client;

  Future<OotdRecord> createOotd({
    required String userId,
    required DateTime date,
    required String originalImageUrl,
    required String mood,
    required bool isPublic,
    required List<OotdItem> items,
    Map<String, dynamic>? weatherSnapshot,
  }) async {
    final recordData = await _supabase
        .from('ootd_records')
        .insert({
          'user_id': userId,
          'date': date.toIso8601String().split('T').first,
          'original_image_url': originalImageUrl,
          'mood': mood,
          'is_public': isPublic,
          if (weatherSnapshot != null) 'weather_snapshot': weatherSnapshot,
        })
        .select()
        .single();

    final ootdId = recordData['id'] as String;

    if (items.isNotEmpty) {
      final itemsData = items.asMap().entries.map((entry) {
        final idx = entry.key;
        final item = entry.value;
        return {
          'ootd_id': ootdId,
          'category': item.category,
          'brand': item.brand,
          'product_name': item.productName,
          'style_description': item.styleDescription,
          'color': item.color,
          'order_idx': idx,
        };
      }).toList();

      await _supabase.from('ootd_items').insert(itemsData);
    }

    final itemRows = await _supabase
        .from('ootd_items')
        .select()
        .eq('ootd_id', ootdId)
        .order('order_idx');

    return OotdRecord.fromJson({
      ...recordData,
      'ootd_items': itemRows,
    });
  }

  Future<Map<DateTime, List<OotdRecord>>> getOotdsByMonth(
    String userId,
    int year,
    int month,
  ) async {
    final from = DateTime(year, month, 1);
    final to = DateTime(year, month + 1, 0); // 해당 월 마지막 날

    final rows = await _supabase
        .from('ootd_records')
        .select('*, ootd_items(*)')
        .eq('user_id', userId)
        .gte('date', from.toIso8601String().split('T').first)
        .lte('date', to.toIso8601String().split('T').first)
        .order('date');

    final result = <DateTime, List<OotdRecord>>{};
    for (final row in rows) {
      final record = OotdRecord.fromJson(row);
      final key = DateTime(record.date.year, record.date.month, record.date.day);
      result.putIfAbsent(key, () => []).add(record);
    }
    return result;
  }
}
