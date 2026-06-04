<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UploadAttachmentRequest;
use App\Http\Resources\AttachmentResource;
use App\Models\Attachment;
use App\Models\Comment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    private const DISK = 'local';

    /** Global media browser — used by the Files page. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Attachment::class);

        // attachable is polymorphic — Comment needs its parent task loaded so AttachmentResource
        // can show the source label. Task is already its own source, so no nested load.
        $items = Attachment::query()
            ->with([
                'uploader',
                'attachable' => fn ($morphTo) => $morphTo->morphWith([Comment::class => ['task']]),
            ])
            ->latest()
            ->limit(500)
            ->get();

        return AttachmentResource::collection($items);
    }

    public function store(UploadAttachmentRequest $request): JsonResponse
    {
        $parent = $request->resolveAttachable();
        $file = $request->file('file');

        // Use year/month folders so a single directory never grows unbounded.
        $folder = sprintf('attachments/%s', now()->format('Y/m'));
        $path = $file->store($folder, self::DISK);

        $attachment = Attachment::create([
            'attachable_type' => $parent::class,
            'attachable_id' => $parent->id,
            'user_id' => $request->user()->id,
            'disk' => self::DISK,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'size_bytes' => $file->getSize() ?? 0,
        ]);

        return response()->json([
            'attachment' => new AttachmentResource(
                $attachment->load([
                    'uploader',
                    'attachable' => fn ($morphTo) => $morphTo->morphWith([Comment::class => ['task']]),
                ]),
            ),
        ], 201);
    }

    public function destroy(Request $request, Attachment $attachment): JsonResponse
    {
        $this->authorize('delete', $attachment);
        $attachment->delete();

        return response()->json(['message' => 'File removed.']);
    }

    /**
     * Stream the file with the original filename — used both by inline previews
     * (images) and by the "Copy link" affordance on the Files page.
     */
    public function download(Request $request, Attachment $attachment): StreamedResponse
    {
        if (! $request->user()->can('view', $attachment)) {
            abort(403);
        }

        $disposition = $attachment->isImage() ? 'inline' : 'attachment';

        return Storage::disk($attachment->disk)->response(
            $attachment->path,
            $attachment->original_name,
            ['Content-Type' => $attachment->mime_type],
            $disposition,
        );
    }
}
