import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/gemini_service.dart';
import '../../shared/models/ootd_item.dart';

final geminiServiceProvider = Provider<GeminiService>((ref) => GeminiService());

enum UploadStatus { idle, analyzing, done, error }

class UploadState {
  final UploadStatus status;
  final String? imagePath;
  final List<OotdItem> items;
  final String? errorMessage;

  const UploadState({
    this.status = UploadStatus.idle,
    this.imagePath,
    this.items = const [],
    this.errorMessage,
  });

  UploadState copyWith({
    UploadStatus? status,
    String? imagePath,
    List<OotdItem>? items,
    String? errorMessage,
  }) {
    return UploadState(
      status: status ?? this.status,
      imagePath: imagePath ?? this.imagePath,
      items: items ?? this.items,
      errorMessage: errorMessage,
    );
  }
}

class UploadNotifier extends Notifier<UploadState> {
  @override
  UploadState build() => const UploadState();

  Future<void> analyzeImage(String imagePath) async {
    state = state.copyWith(
      status: UploadStatus.analyzing,
      imagePath: imagePath,
      items: [],
      errorMessage: null,
    );
    try {
      final service = ref.read(geminiServiceProvider);
      final items = await service.analyzeOutfitImage(imagePath);
      state = state.copyWith(status: UploadStatus.done, items: items);
    } catch (e) {
      state = state.copyWith(
        status: UploadStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  void reset() => state = const UploadState();
}

final uploadProvider = NotifierProvider<UploadNotifier, UploadState>(
  UploadNotifier.new,
);
