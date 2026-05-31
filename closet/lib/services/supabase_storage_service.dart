import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseStorageService {
  final _supabase = Supabase.instance.client;
  static const _bucket = 'ootd-images';

  Future<String> uploadOotdImage(String userId, String localPath) async {
    final file = File(localPath);
    final ext = localPath.split('.').last.toLowerCase();
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final storagePath = '$userId/$timestamp.$ext';

    await _supabase.storage.from(_bucket).upload(
          storagePath,
          file,
          fileOptions: FileOptions(
            contentType: 'image/$ext',
            upsert: false,
          ),
        );

    return _supabase.storage.from(_bucket).getPublicUrl(storagePath);
  }

  Future<void> deleteOotdImage(String publicUrl) async {
    final uri = Uri.parse(publicUrl);
    final pathSegments = uri.pathSegments;
    final bucketIndex = pathSegments.indexOf(_bucket);
    if (bucketIndex == -1) return;
    final storagePath = pathSegments.sublist(bucketIndex + 1).join('/');
    await _supabase.storage.from(_bucket).remove([storagePath]);
  }
}
