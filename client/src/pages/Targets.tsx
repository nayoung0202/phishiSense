import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Upload } from "lucide-react";
import { type Target } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function Targets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: targets = [], isLoading } = useQuery<Target[]>({
    queryKey: ["/api/targets"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/targets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({
        title: "삭제 완료",
        description: "훈련 대상자가 삭제되었습니다.",
      });
    },
  });

  const filteredTargets = targets.filter((target) =>
    target.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    target.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    target.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTargets(filteredTargets.map(t => t.id));
    } else {
      setSelectedTargets([]);
    }
  };

  const handleSelectTarget = (targetId: string, checked: boolean) => {
    if (checked) {
      setSelectedTargets([...selectedTargets, targetId]);
    } else {
      setSelectedTargets(selectedTargets.filter(id => id !== targetId));
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "CSV 업로드",
        description: `${file.name} 파일을 처리 중입니다...`,
      });
      console.log('CSV upload:', file.name);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">훈련 대상 관리</h1>
          <p className="text-muted-foreground">훈련 대상자를 등록하고 관리하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-csv-upload">
                <Upload className="w-4 h-4 mr-2" />
                CSV 업로드
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>CSV 파일 업로드</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  이름, 이메일, 소속, 태그 정보가 포함된 CSV 파일을 업로드하세요.
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  data-testid="input-csv-file"
                />
              </div>
            </DialogContent>
          </Dialog>
          <Button data-testid="button-add-target">
            <Plus className="w-4 h-4 mr-2" />
            대상자 추가
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="이름, 이메일, 소속으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {selectedTargets.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedTargets.length}명 선택됨
            </span>
            <Button variant="outline" size="sm" data-testid="button-add-to-group">
              그룹에 추가
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (confirm(`${selectedTargets.length}명을 삭제하시겠습니까?`)) {
                  selectedTargets.forEach(id => deleteMutation.mutate(id));
                  setSelectedTargets([]);
                }
              }}
              data-testid="button-delete-selected"
            >
              선택 삭제
            </Button>
          </div>
        )}

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedTargets.length === filteredTargets.length && filteredTargets.length > 0}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>소속</TableHead>
                <TableHead>태그</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : filteredTargets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    훈련 대상자가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredTargets.map((target) => (
                  <TableRow key={target.id} data-testid={`row-target-${target.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTargets.includes(target.id)}
                        onCheckedChange={(checked) => handleSelectTarget(target.id, checked as boolean)}
                        data-testid={`checkbox-target-${target.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{target.name}</TableCell>
                    <TableCell>{target.email}</TableCell>
                    <TableCell>{target.department || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {target.tags?.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-500/20 text-green-400">
                        {target.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" data-testid={`button-edit-${target.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(target.id)}
                          data-testid={`button-delete-${target.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
