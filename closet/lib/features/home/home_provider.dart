import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/ootd_service.dart';
import '../../shared/models/ootd_record.dart';

final ootdServiceProvider = Provider<OotdService>((ref) => OotdService());

final ootdsByMonthProvider = FutureProvider.family<
    Map<DateTime, List<OotdRecord>>,
    ({int year, int month})>((ref, params) async {
  final userId = Supabase.instance.client.auth.currentUser?.id;
  if (userId == null) return {};
  return ref
      .watch(ootdServiceProvider)
      .getOotdsByMonth(userId, params.year, params.month);
});
